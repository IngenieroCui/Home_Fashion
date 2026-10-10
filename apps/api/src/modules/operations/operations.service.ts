import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { QueryTypes, Sequelize } from 'sequelize';
import { AuthService } from '../auth/auth.service';
import { calculatePaymentSummary, cents, money } from '../sales/sales-calculations';
import { OperationsQueryDto } from './dto/operations-query.dto';
import {
  LOW_STOCK_THRESHOLD,
  type Activity,
  type InventoryAlert,
  type OperationCapabilities
} from './operations.types';

type RecordRow = {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
};
type SaleRow = RecordRow & { total: string };
type PaymentRow = { saleId: string; type: string; amount: string; adjustmentEffect: string | null };
type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  categoryId: string;
  categoryName: string;
  sku: string;
  variantName: string | null;
  imageUrl: string | null;
  salePrice: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  location: string | null;
  productStatus: string;
  variantStatus: string;
};
type StockSummary = {
  activeVariants: number;
  onHandUnits: number;
  reservedUnits: number;
  availableUnits: number;
  lowStockVariants: number;
  outOfStockVariants: number;
};
const date = (value: unknown) => new Date(value as string).toISOString();
const record = (row: RecordRow) => ({
  ...row,
  id: String(row.id),
  createdAt: date(row.createdAt),
  updatedAt: date(row.updatedAt)
});
const alert = (available: number): InventoryAlert =>
  available <= 0 ? 'OUT_OF_STOCK' : available <= LOW_STOCK_THRESHOLD ? 'LOW_STOCK' : 'AVAILABLE';

@Injectable()
export class OperationsService {
  constructor(
    @InjectConnection() private readonly db: Sequelize,
    private readonly auth: AuthService
  ) {}
  private rows<T extends object>(sql: string, replacements: Record<string, string | number> = {}) {
    return this.db.query<T>(sql, { replacements, type: QueryTypes.SELECT });
  }
  private async access(userId: string, permission?: string): Promise<OperationCapabilities> {
    const user = await this.auth.getAuthenticatedUser(userId);
    if (user.role === 'WORKSHOP')
      throw new ForbiddenException('Este panel es para el equipo interno');
    const can = (code: string) => user.role === 'ADMIN' || user.permissions.includes(code);
    if (permission && !can(permission))
      throw new ForbiddenException('No tienes permiso para esta operación');
    return {
      quotes: can('QUOTE_MANAGE'),
      customers: can('CUSTOMER_MANAGE'),
      sales: can('SALE_MANAGE'),
      payments: can('SALE_MANAGE') && can('FINANCIAL_PAYMENT_REGISTER'),
      orders: can('ORDER_MANAGE'),
      catalog: can('CATALOG_MANAGE'),
      workshop: can('WORKSHOP_MANAGE'),
      progressReview: can('PROGRESS_REVIEW'),
      deliveries: can('ORDER_MANAGE')
    };
  }
  private async counts(table: 'quotes' | 'orders' | 'workshop_jobs' | 'deliveries') {
    const rows = await this.rows<{ status: string; count: number }>(
      `SELECT status, COUNT(*) AS count FROM ${table} GROUP BY status`
    );
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }
  private async salesWithBalances(customerId?: string) {
    const filter = customerId
      ? 'WHERE s.customer_id = :customerId'
      : "WHERE s.status = 'CONFIRMED'";
    const replacements: Record<string, string | number> = customerId ? { customerId } : {};
    const sales = await this.rows<SaleRow>(
      `SELECT s.id, s.code, s.status, s.total, s.created_at AS createdAt, GREATEST(s.updated_at,COALESCE((SELECT MAX(p2.updated_at) FROM sale_payments p2 WHERE p2.sale_id=s.id),s.updated_at)) AS updatedAt FROM sales s ${filter} ORDER BY s.created_at DESC, s.id DESC`,
      replacements
    );
    const payments = await this.rows<PaymentRow>(
      `SELECT p.sale_id AS saleId, p.type, p.amount, p.adjustment_effect AS adjustmentEffect FROM sale_payments p JOIN sales s ON s.id = p.sale_id ${filter} AND p.status = 'REGISTERED'`,
      replacements
    );
    const grouped = new Map<string, PaymentRow[]>();
    for (const payment of payments) {
      const id = String(payment.saleId);
      const values = grouped.get(id) ?? [];
      values.push(payment);
      grouped.set(id, values);
    }
    return sales.map((sale) => ({
      ...record(sale),
      total: sale.total,
      ...calculatePaymentSummary(grouped.get(String(sale.id)) ?? [], sale.total)
    }));
  }
  private async stockSummary(
    where = '',
    replacements: Record<string, string | number> = {}
  ): Promise<StockSummary> {
    const [summary] = await this.rows<StockSummary>(
      `SELECT COUNT(*) AS activeVariants, COALESCE(SUM(v.quantity_on_hand),0) AS onHandUnits,
      COALESCE(SUM(v.quantity_reserved),0) AS reservedUnits, COALESCE(SUM(v.quantity_on_hand-v.quantity_reserved),0) AS availableUnits,
      COALESCE(SUM(v.quantity_on_hand-v.quantity_reserved > 0 AND v.quantity_on_hand-v.quantity_reserved <= ${LOW_STOCK_THRESHOLD}),0) AS lowStockVariants,
      COALESCE(SUM(v.quantity_on_hand-v.quantity_reserved <= 0),0) AS outOfStockVariants
      FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.status='ACTIVE' ${where}`,
      replacements
    );
    return Object.fromEntries(
      Object.entries(summary).map(([key, value]) => [key, Number(value)])
    ) as StockSummary;
  }
  async overview(userId: string) {
    const capabilities = await this.access(userId);
    const attention: Record<string, { count: number; items: object[] }> = {};
    const recentActivity: Activity[] = [];
    const push = (
      kind: Activity['kind'],
      rows: RecordRow[],
      title: string,
      path: string,
      changed = false
    ) => {
      recentActivity.push(
        ...rows.map((row) => ({
          kind,
          id: String(row.id),
          code: row.code,
          title,
          subtitle: row.customerName,
          status: row.status,
          occurredAt: date(changed ? row.updatedAt : row.createdAt),
          href: `${path}/${row.id}`
        }))
      );
    };
    if (capabilities.quotes) {
      const counts = await this.counts('quotes');
      const pending = await this.rows<RecordRow>(
        "SELECT q.id,q.code,q.status,q.created_at AS createdAt,q.updated_at AS updatedAt,c.full_name AS customerName FROM quotes q JOIN customers c ON c.id=q.customer_id WHERE q.status='REQUESTED' ORDER BY q.created_at ASC LIMIT 5"
      );
      attention.requestedQuotes = { count: counts.REQUESTED ?? 0, items: pending.map(record) };
      push(
        'QUOTE',
        await this.rows<RecordRow>(
          'SELECT q.id,q.code,q.status,q.created_at AS createdAt,q.updated_at AS updatedAt,c.full_name AS customerName FROM quotes q JOIN customers c ON c.id=q.customer_id ORDER BY q.updated_at DESC LIMIT 10'
        ),
        'Cotización actualizada',
        '/panel/cotizaciones',
        true
      );
    }
    let financial;
    if (capabilities.sales) {
      const sales = await this.salesWithBalances();
      financial = {
        confirmedSales: sales.length,
        pendingPaymentSales: sales.filter((s) => s.paymentStatus === 'PENDING').length,
        partiallyPaidSales: sales.filter((s) => s.paymentStatus === 'PARTIALLY_PAID').length,
        paidSales: sales.filter((s) => s.paymentStatus === 'PAID').length,
        outstandingBalance: money(sales.reduce((sum, s) => sum + cents(s.balance), 0n))
      };
      push(
        'SALE',
        await this.rows<RecordRow>(
          'SELECT s.id,s.code,s.status,s.created_at AS createdAt,s.updated_at AS updatedAt,c.full_name AS customerName FROM sales s JOIN customers c ON c.id=s.customer_id ORDER BY s.created_at DESC LIMIT 10'
        ),
        'Venta registrada',
        '/panel/ventas'
      );
      const payments = await this.rows<RecordRow & { saleId: string }>(
        "SELECT p.id,s.id AS saleId,s.code,p.status,p.created_at AS createdAt,p.updated_at AS updatedAt,c.full_name AS customerName FROM sale_payments p JOIN sales s ON s.id=p.sale_id JOIN customers c ON c.id=p.customer_id WHERE p.status='REGISTERED' ORDER BY p.created_at DESC LIMIT 10"
      );
      recentActivity.push(
        ...payments.map((p) => ({
          kind: 'PAYMENT' as const,
          id: String(p.id),
          code: p.code,
          title: 'Movimiento registrado',
          subtitle: p.customerName,
          status: p.status,
          occurredAt: date(p.createdAt),
          href: `/panel/ventas/${p.saleId}`
        }))
      );
    }
    let orders;
    let deliveries;
    if (capabilities.orders) {
      const counts = await this.counts('orders');
      orders = {
        open: counts.OPEN ?? 0,
        inProgress: counts.IN_PROGRESS ?? 0,
        ready: counts.READY ?? 0
      };
      attention.openOrders = {
        count: orders.open,
        items: (
          await this.rows<RecordRow>(
            "SELECT o.id,o.code,o.status,o.created_at AS createdAt,o.updated_at AS updatedAt,c.full_name AS customerName FROM orders o JOIN customers c ON c.id=o.customer_id WHERE o.status='OPEN' ORDER BY o.created_at ASC LIMIT 5"
          )
        ).map(record)
      };
      push(
        'ORDER',
        await this.rows<RecordRow>(
          'SELECT id,code,status,created_at AS createdAt,updated_at AS updatedAt FROM orders ORDER BY created_at DESC LIMIT 10'
        ),
        'Pedido creado',
        '/panel/pedidos'
      );
      const deliveryCounts = await this.counts('deliveries');
      deliveries = {
        scheduled: deliveryCounts.SCHEDULED ?? 0,
        outForDelivery: deliveryCounts.OUT_FOR_DELIVERY ?? 0
      };
      attention.scheduledDeliveries = {
        count: deliveries.scheduled,
        items: (
          await this.rows<RecordRow>(
            "SELECT id,code,status,scheduled_date AS scheduledDate,created_at AS createdAt,updated_at AS updatedAt,contact_name AS customerName FROM deliveries WHERE status='SCHEDULED' ORDER BY scheduled_date ASC LIMIT 5"
          )
        ).map(record)
      };
      push(
        'DELIVERY',
        await this.rows<RecordRow>(
          'SELECT id,code,status,created_at AS createdAt,updated_at AS updatedAt FROM deliveries ORDER BY updated_at DESC LIMIT 10'
        ),
        'Entrega actualizada',
        '/panel/entregas',
        true
      );
    }
    let production;
    if (capabilities.workshop || capabilities.progressReview) {
      const counts = await this.counts('workshop_jobs');
      if (capabilities.workshop)
        production = {
          assigned: counts.ASSIGNED ?? 0,
          inProgress: counts.IN_PROGRESS ?? 0,
          readyForReview: counts.READY_FOR_REVIEW ?? 0,
          completed: counts.COMPLETED ?? 0
        };
      attention.readyForReview = {
        count: counts.READY_FOR_REVIEW ?? 0,
        items: (
          await this.rows<RecordRow>(
            "SELECT id,code,status,created_at AS createdAt,updated_at AS updatedAt FROM workshop_jobs WHERE status='READY_FOR_REVIEW' ORDER BY updated_at ASC LIMIT 5"
          )
        ).map(record)
      };
      const jobs = await this.rows<RecordRow>(
        `SELECT id,code,status,created_at AS createdAt,updated_at AS updatedAt FROM workshop_jobs ${capabilities.workshop ? '' : "WHERE status='READY_FOR_REVIEW'"} ORDER BY updated_at DESC LIMIT 10`
      );
      for (const job of jobs)
        recentActivity.push({
          kind: 'WORKSHOP',
          id: String(job.id),
          code: job.code,
          title: job.status === 'READY_FOR_REVIEW' ? 'Listo para revisión' : 'Trabajo actualizado',
          status: job.status,
          occurredAt: date(job.updatedAt),
          href: capabilities.workshop
            ? `/panel/talleres/trabajos/${job.id}`
            : '/panel/talleres/avances'
        });
    }
    const stock = capabilities.catalog ? await this.stockSummary() : undefined;
    return {
      generatedAt: new Date().toISOString(),
      capabilities,
      attention,
      ...(financial ? { financial } : {}),
      ...(orders ? { orders } : {}),
      ...(deliveries ? { deliveries } : {}),
      ...(production ? { production } : {}),
      ...(stock
        ? {
            inventory: {
              totalActiveVariants: stock.activeVariants,
              availableUnits: stock.availableUnits,
              reservedUnits: stock.reservedUnits,
              outOfStockVariants: stock.outOfStockVariants,
              lowStockVariants: stock.lowStockVariants
            }
          }
        : {}),
      recentActivity: recentActivity
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 10)
    };
  }
  async inventory(query: OperationsQueryDto, userId: string) {
    await this.access(userId, 'CATALOG_MANAGE');
    const replacements: Record<string, string | number> = {
      limit: query.limit,
      offset: (query.page - 1) * query.limit
    };
    const conditions: string[] = [];
    if (query.q) {
      conditions.push('(p.name LIKE :q OR v.sku LIKE :q OR v.name LIKE :q)');
      replacements.q = `%${query.q}%`;
    }
    if (query.categoryId) {
      conditions.push('p.category_id=:categoryId');
      replacements.categoryId = query.categoryId;
    }
    if (query.status) {
      conditions.push('v.status=:status');
      replacements.status = query.status;
    }
    const summaryWhere = conditions.length ? `AND ${conditions.join(' AND ')}` : '';
    const available = '(v.quantity_on_hand-v.quantity_reserved)';
    if (query.alert === 'RESERVED') conditions.push('v.quantity_reserved>0');
    else if (query.alert && query.alert !== 'ALL') {
      conditions.push("v.status='ACTIVE'");
      conditions.push(
        query.alert === 'OUT_OF_STOCK'
          ? `${available}<=0`
          : query.alert === 'LOW_STOCK'
            ? `${available}>0 AND ${available}<=${LOW_STOCK_THRESHOLD}`
            : `${available}>${LOW_STOCK_THRESHOLD}`
      );
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [count] = await this.rows<{ total: number }>(
      `SELECT COUNT(*) AS total FROM product_variants v JOIN products p ON p.id=v.product_id ${where}`,
      replacements
    );
    const data = await this.rows<InventoryRow>(
      `SELECT v.id AS variantId,p.id AS productId,p.name AS productName,p.slug AS productSlug,
      c.id AS categoryId,c.name AS categoryName,v.sku,v.name AS variantName,v.sale_price AS salePrice,v.quantity_on_hand AS quantityOnHand,
      v.quantity_reserved AS quantityReserved,${available} AS quantityAvailable,v.location,p.status AS productStatus,v.status AS variantStatus,
      (SELECT i.url FROM product_images i WHERE i.product_id=p.id AND (i.product_variant_id=v.id OR i.product_variant_id IS NULL)
        ORDER BY (i.product_variant_id=v.id) DESC,i.is_primary DESC,i.position ASC,i.id ASC LIMIT 1) AS imageUrl
      FROM product_variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id ${where}
      ORDER BY p.name ASC,v.sku ASC LIMIT :limit OFFSET :offset`,
      replacements
    );
    return {
      summary: await this.stockSummary(summaryWhere, replacements),
      data: data.map(({ categoryId, categoryName, ...row }) => ({
        ...row,
        variantId: String(row.variantId),
        productId: String(row.productId),
        category: { id: String(categoryId), name: categoryName },
        alert: alert(row.quantityAvailable)
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: Number(count.total),
        totalPages: Math.ceil(Number(count.total) / query.limit)
      }
    };
  }
  async customer(id: string, userId: string) {
    const can = await this.access(userId, 'CUSTOMER_MANAGE');
    const [customer] = await this.rows<{
      id: string;
      updatedAt: string;
      isActive: boolean | number;
    }>(
      `SELECT id,full_name AS fullName,document_type AS documentType,document_number AS documentNumber,
      phone,email,city,neighborhood,address,notes,is_active AS isActive,created_at AS createdAt,updated_at AS updatedAt FROM customers WHERE id=:id`,
      { id }
    );
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    const summary: {
      quoteCount?: number;
      activeQuoteCount?: number;
      saleCount?: number;
      outstandingBalance?: string;
      orderCount?: number;
      activeOrderCount?: number;
      lastActivityAt: string | null;
    } = { lastActivityAt: date(customer.updatedAt) };
    let quotes, sales, orders, deliveries;
    const last = (rows: RecordRow[]) => {
      for (const row of rows) {
        const when = date(row.updatedAt);
        if (!summary.lastActivityAt || when > summary.lastActivityAt) summary.lastActivityAt = when;
      }
    };
    if (can.quotes) {
      const [counts] = await this.rows<{ total: number; active: number; lastAt: string | null }>(
        "SELECT COUNT(*) AS total,COALESCE(SUM(status IN ('REQUESTED','DRAFT','QUOTED','ACCEPTED')),0) AS active,MAX(updated_at) AS lastAt FROM quotes WHERE customer_id=:id",
        { id }
      );
      if (counts.lastAt && date(counts.lastAt) > (summary.lastActivityAt ?? ''))
        summary.lastActivityAt = date(counts.lastAt);
      summary.quoteCount = Number(counts.total);
      summary.activeQuoteCount = Number(counts.active);
      quotes = (
        await this.rows<RecordRow>(
          'SELECT id,code,status,total,valid_until AS validUntil,created_at AS createdAt,updated_at AS updatedAt FROM quotes WHERE customer_id=:id ORDER BY created_at DESC,id DESC LIMIT 10',
          { id }
        )
      ).map(record);
      last(quotes);
    }
    if (can.sales) {
      const all = await this.salesWithBalances(id);
      summary.saleCount = all.length;
      summary.outstandingBalance = money(
        all.filter((s) => s.status === 'CONFIRMED').reduce((sum, s) => sum + cents(s.balance), 0n)
      );
      sales = all.slice(0, 10);
      last(all);
    }
    if (can.orders) {
      const [counts] = await this.rows<{ total: number; active: number; lastAt: string | null }>(
        "SELECT COUNT(*) AS total,COALESCE(SUM(status IN ('OPEN','IN_PROGRESS','READY')),0) AS active,MAX(updated_at) AS lastAt FROM orders WHERE customer_id=:id",
        { id }
      );
      if (counts.lastAt && date(counts.lastAt) > (summary.lastActivityAt ?? ''))
        summary.lastActivityAt = date(counts.lastAt);
      const [deliveryActivity] = await this.rows<{ lastAt: string | null }>(
        'SELECT MAX(d.updated_at) AS lastAt FROM deliveries d JOIN orders o ON o.id=d.order_id WHERE o.customer_id=:id',
        { id }
      );
      if (deliveryActivity.lastAt && date(deliveryActivity.lastAt) > (summary.lastActivityAt ?? ''))
        summary.lastActivityAt = date(deliveryActivity.lastAt);
      summary.orderCount = Number(counts.total);
      summary.activeOrderCount = Number(counts.active);
      orders = (
        await this.rows<RecordRow>(
          `SELECT o.id,o.code,o.status,o.promised_date AS promisedDate,o.created_at AS createdAt,o.updated_at AS updatedAt,
        (SELECT image_url_snapshot FROM order_items WHERE order_id=o.id ORDER BY id ASC LIMIT 1) AS imageUrlSnapshot
        FROM orders o WHERE o.customer_id=:id ORDER BY o.created_at DESC,o.id DESC LIMIT 10`,
          { id }
        )
      ).map(record);
      last(orders);
      deliveries = (
        await this.rows<RecordRow>(
          'SELECT d.id,d.code,d.status,d.scheduled_date AS scheduledDate,d.delivered_at AS deliveredAt,d.created_at AS createdAt,d.updated_at AS updatedAt FROM deliveries d JOIN orders o ON o.id=d.order_id WHERE o.customer_id=:id ORDER BY d.created_at DESC,d.id DESC LIMIT 10',
          { id }
        )
      ).map(record);
      last(deliveries);
    }
    return {
      customer: { ...customer, id: String(customer.id), isActive: Boolean(customer.isActive) },
      capabilities: {
        quotes: can.quotes,
        sales: can.sales,
        orders: can.orders,
        deliveries: can.deliveries
      },
      summary,
      ...(quotes ? { quotes } : {}),
      ...(sales ? { sales } : {}),
      ...(orders ? { orders } : {}),
      ...(deliveries ? { deliveries } : {})
    };
  }
  async orderPreparation(id: string, userId: string) {
    await this.access(userId, 'ORDER_MANAGE');
    const [sale] = await this.rows<{
      id: string;
      code: string;
      createdAt: string;
      status: string;
      customerId: string;
      customerName: string;
    }>(
      'SELECT s.id,s.code,s.created_at AS createdAt,s.status,c.id AS customerId,c.full_name AS customerName FROM sales s JOIN customers c ON c.id=s.customer_id WHERE s.id=:id',
      { id }
    );
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status !== 'CONFIRMED')
      throw new BadRequestException('Solo las ventas confirmadas pueden crear pedidos');
    const [existing] = await this.rows<{ id: string }>('SELECT id FROM orders WHERE sale_id=:id', {
      id
    });
    if (existing) throw new BadRequestException('Esta venta ya tiene un pedido');
    const items = await this.rows<{
      saleItemId: string;
      productId: string;
      productVariantId: string | null;
      quantity: number;
      quantityOnHand: number | null;
      quantityReserved: number | null;
      location: string | null;
      variantStatus: string | null;
    }>(
      `SELECT i.id AS saleItemId,i.product_id AS productId,i.product_variant_id AS productVariantId,i.product_name_snapshot AS productNameSnapshot,
      i.variant_name_snapshot AS variantNameSnapshot,i.image_url_snapshot AS imageUrlSnapshot,i.sku_snapshot AS skuSnapshot,i.quantity,i.customization,i.notes,
      v.quantity_on_hand AS quantityOnHand,v.quantity_reserved AS quantityReserved,v.location,v.status AS variantStatus
      FROM sale_items i LEFT JOIN product_variants v ON v.id=i.product_variant_id WHERE i.sale_id=:id ORDER BY i.id ASC`,
      { id }
    );
    return {
      sale: {
        id: String(sale.id),
        code: sale.code,
        createdAt: date(sale.createdAt),
        customer: { id: String(sale.customerId), fullName: sale.customerName }
      },
      items: items.map(({ quantityOnHand, quantityReserved, location, variantStatus, ...item }) => {
        const inventory =
          item.productVariantId && quantityOnHand !== null
            ? {
                quantityOnHand,
                quantityReserved: quantityReserved ?? 0,
                quantityAvailable: quantityOnHand - (quantityReserved ?? 0),
                location,
                variantStatus
              }
            : null;
        return {
          ...item,
          saleItemId: String(item.saleItemId),
          productId: String(item.productId),
          productVariantId: item.productVariantId ? String(item.productVariantId) : null,
          inventory,
          suggestedSupplyType:
            inventory?.variantStatus === 'ACTIVE' && inventory.quantityAvailable >= item.quantity
              ? 'IN_STOCK'
              : 'MADE_TO_ORDER'
        };
      })
    };
  }
}
