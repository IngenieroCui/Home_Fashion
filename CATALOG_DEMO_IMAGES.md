# Imágenes demo del catálogo Home Fashion

Las fotografías son referencias de demostración, no fotografías de muebles fabricados por Home Fashion. La opción seleccionada y la propuesta final se confirman al cotizar.

Fuente exclusiva: Unsplash gratuito. Se excluyen Unsplash+, fuentes comerciales ajenas, watermarks y resultados de Pinterest/Google Images. Licencia: https://unsplash.com/license.

Sprint 3/4: 41 productos, 41 fotografías primarias diferentes y 53 asignaciones en el manifest (12 fotografías secundarias). Las 20 nuevas primarias se seleccionaron desde resultados `license=free` con `premium=false` y se revisaron visualmente. Los archivos nuevos se descargan directamente desde `images.unsplash.com` y se suben a Cloudinary; no se copian en el repositorio.

## Sincronización selectiva

Una única interfaz CSV: `--products=slug,slug`. Se rechazan slugs vacíos o desconocidos; todos los productos seleccionados se verifican en base de datos antes de comenzar cargas. No se alteran productos fuera del filtro.

```bash
pnpm --filter @home-fashion/api catalog:media:sync --products=sofa-praga,sofa-porto --dry-run --force
pnpm --filter @home-fashion/api catalog:media:sync --products=sofa-praga,sofa-porto --apply --force
pnpm --filter @home-fashion/api catalog:media:sync --products=sofa-praga,sofa-porto --dry-run
```

`--force` reemplaza los assets del subset conservando public IDs, registros y snapshots. El dry-run final sin force verifica que no quedan entradas por sincronizar. Los flags `--apply` y `--dry-run` son mutuamente excluyentes.

## Registro de fuentes

| Producto / slug | Foto | Fotógrafo | Página fuente | Asset fuente / archivo previo |
|---|---|---|---|---|
| `sofa-verona` | Primaria | Parth Savani | https://unsplash.com/photos/two-beige-sofas-in-a-modern-living-room-oGJLFNnD_Ek | apps/web/public/catalog/sofa-verona.webp |
| `sofa-verona` | Secundaria | Zongnan Bao | https://unsplash.com/photos/modern-living-room-with-white-sofa-and-large-window-YKMByxsdyDY | https://unsplash.com/photos/YKMByxsdyDY/download?force=true |
| `sofa-boreal` | Primaria | David Marquez | https://unsplash.com/photos/spacious-living-room-with-beige-sofas-mj1VcrVMs4g | apps/web/public/catalog/sofa-boreal.webp |
| `sofa-boreal` | Secundaria | GoodLifeConstruction | https://unsplash.com/photos/modern-living-room-with-minimalist-furniture-and-decor-e0oJLc5FYsg | https://unsplash.com/photos/e0oJLc5FYsg/download?force=true |
| `sofa-lino` | Primaria | Andy Bob | https://unsplash.com/photos/modern-living-room-with-beige-sofa-and-contemporary-lamp-e29s9vkVUIg | apps/web/public/catalog/sofa-lino.webp |
| `sofa-lino` | Secundaria | Zongnan Bao | https://unsplash.com/photos/modern-living-room-with-white-sofa-and-large-window-YKMByxsdyDY | https://unsplash.com/photos/YKMByxsdyDY/download?force=true |
| `comedor-siena` | Primaria | Costa Live | https://unsplash.com/photos/a-wooden-dining-table-with-upholstered-chairs-RmXgAsUqWUI | apps/web/public/catalog/comedor-siena.webp |
| `comedor-siena` | Secundaria | James Coleman | https://unsplash.com/photos/wooden-dining-table-with-chairs-near-a-window-RDBbCyMLlU4 | https://unsplash.com/photos/RDBbCyMLlU4/download?force=true |
| `comedor-roble` | Primaria | Costa Live | https://unsplash.com/photos/a-wooden-dining-table-with-chairs-in-a-modern-room-s9tXp0AahZc | apps/web/public/catalog/comedor-roble.webp |
| `comedor-roble` | Secundaria | James Coleman | https://unsplash.com/photos/wooden-dining-table-with-chairs-near-a-window-RDBbCyMLlU4 | https://unsplash.com/photos/RDBbCyMLlU4/download?force=true |
| `comedor-oliva` | Primaria | Jonathan Borba | https://unsplash.com/photos/white-wooden-table-with-chairs-kjh70RMHDco | apps/web/public/catalog/comedor-oliva.webp |
| `cama-napoles` | Primaria | Aleksandra Dementeva | https://unsplash.com/photos/modern-bedroom-with-a-bed-and-nightstand-fhHCxA1Fjuo | apps/web/public/catalog/cama-napoles.webp |
| `cama-napoles` | Secundaria | Andrea Davis | https://unsplash.com/photos/a-bedroom-with-a-bed-and-a-window-OICCXcQ4e10 | https://unsplash.com/photos/OICCXcQ4e10/download?force=true |
| `cama-alba` | Primaria | Christian Ventura | https://unsplash.com/photos/modern-bedroom-with-a-bed-and-armchair--3PiIk77r6s | apps/web/public/catalog/cama-alba.webp |
| `cama-alba` | Secundaria | Andrea Davis | https://unsplash.com/photos/a-bedroom-with-a-bed-and-a-window-OICCXcQ4e10 | https://unsplash.com/photos/OICCXcQ4e10/download?force=true |
| `cama-nordica` | Primaria | Lukáš Parničan | https://unsplash.com/photos/a-modern-bedroom-with-a-bed-and-built-in-lighting-LZ3IQuhGbQE | apps/web/public/catalog/cama-nordica.webp |
| `sofa-lisboa` | Primaria | GoodLifeConstruction | https://unsplash.com/photos/modern-living-room-with-minimalist-furniture-and-decor-e0oJLc5FYsg | https://unsplash.com/photos/e0oJLc5FYsg/download?force=true |
| `sofa-lisboa` | Secundaria | Zongnan Bao | https://unsplash.com/photos/modern-living-room-with-white-sofa-and-large-window-YKMByxsdyDY | https://unsplash.com/photos/YKMByxsdyDY/download?force=true |
| `sofa-camelia` | Primaria | Inside Weather | https://unsplash.com/photos/red-fabric-sofa-dbH_vy7vICE | https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=max&w=1600&q=85 |
| `sofa-praga` | Primaria | Ambo Ampeng | https://unsplash.com/photos/a-gray-couch-with-four-pillows-on-it-KEGGJPKxcSc | https://images.unsplash.com/photo-1698936061086-2bf99c7b9fc5?auto=format&fit=max&w=1600&q=85 |
| `sofa-porto` | Primaria | Christian Kaindl | https://unsplash.com/photos/beige-leather-2-seat-sofa-4uD9w-pxBTA | https://images.unsplash.com/photo-1512212621149-107ffe572d2f?auto=format&fit=max&w=1600&q=85 |
| `sala-toscana` | Primaria | Josh Sorenson | https://unsplash.com/photos/living-room-with-couch-coffee-table-and-chairs-w9etxmuavOk | https://unsplash.com/photos/w9etxmuavOk/download?force=true |
| `sala-toscana` | Secundaria | GoodLifeConstruction | https://unsplash.com/photos/modern-living-room-with-minimalist-furniture-and-decor-e0oJLc5FYsg | https://unsplash.com/photos/e0oJLc5FYsg/download?force=true |
| `sala-oliva` | Primaria | Sven Brandsma | https://unsplash.com/photos/light-candle-on-round-white-coffee-table-and-sectional-sofa-GZ5cKOgeIB0 | https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?auto=format&fit=max&w=1600&q=85 |
| `sala-malaga` | Primaria | Nathan Fertig | https://unsplash.com/photos/brown-and-white-wooden-table-beside-sofa-chair-FBXuXp57eM0 | https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=max&w=1600&q=85 |
| `comedor-ambar` | Primaria | James Coleman | https://unsplash.com/photos/wooden-dining-table-with-chairs-near-a-window-RDBbCyMLlU4 | https://unsplash.com/photos/RDBbCyMLlU4/download?force=true |
| `comedor-viena` | Primaria | Costa Live | https://unsplash.com/photos/dining-table-with-six-upholstered-chairs-in-a-bright-room-SrbklO9p8gI | https://images.unsplash.com/photo-1758977403341-0104135995af?auto=format&fit=max&w=1600&q=85 |
| `comedor-viena` | Secundaria | Costa Live | https://unsplash.com/photos/a-wooden-dining-table-with-upholstered-chairs-RmXgAsUqWUI | apps/web/public/catalog/comedor-siena.webp |
| `comedor-cedro` | Primaria | Liana Mikah | https://unsplash.com/photos/brown-wooden-table-with-chairs-dpv12vxg_aw | https://images.unsplash.com/photo-1581970696275-253e75ecf269?auto=format&fit=max&w=1600&q=85 |
| `comedor-lima` | Primaria | Regular Man | https://unsplash.com/photos/empty-black-wooden-dining-set-XHbQoXWytNk | https://images.unsplash.com/photo-1547062200-f195b1c77e30?auto=format&fit=max&w=1600&q=85 |
| `cama-roma` | Primaria | Andrea Davis | https://unsplash.com/photos/a-bedroom-with-a-bed-and-a-window-OICCXcQ4e10 | https://unsplash.com/photos/OICCXcQ4e10/download?force=true |
| `cama-roma` | Secundaria | Lukáš Parničan | https://unsplash.com/photos/a-modern-bedroom-with-a-bed-and-built-in-lighting-LZ3IQuhGbQE | apps/web/public/catalog/cama-nordica.webp |
| `cama-luna` | Primaria | Fred Kleber | https://unsplash.com/photos/a-bed-with-white-sheets-and-pillows-in-a-bedroom-7DxE4fiZYeU | https://images.unsplash.com/photo-1687816043131-fd1c0d01df58?auto=format&fit=max&w=1600&q=85 |
| `alcoba-florencia` | Primaria | Francesca Tosolini | https://unsplash.com/photos/beige-bed-with-white-mattress-ghPHKipv790 | https://images.unsplash.com/photo-1560185128-e173042f79dd?auto=format&fit=max&w=1600&q=85 |
| `alcoba-nogal` | Primaria | Point3D Commercial Imaging Ltd. | https://unsplash.com/photos/white-bed-linen-with-blue-throw-pillows-PgU7MbLlg6k | https://images.unsplash.com/photo-1630699293388-0938c397106a?auto=format&fit=max&w=1600&q=85 |
| `silla-mila` | Primaria | ObjectType RAW | https://unsplash.com/photos/a-wooden-chair-stands-against-a-white-background-ZCarpyNlYPQ | https://unsplash.com/photos/ZCarpyNlYPQ/download?force=true |
| `silla-bruna` | Primaria | Hongly Oung | https://unsplash.com/photos/a-wooden-chair-on-a-white-background-iBxQvOLuKb4 | https://images.unsplash.com/photo-1699588772787-1eed3b726e0a?auto=format&fit=max&w=1600&q=85 |
| `silla-elisa` | Primaria | Lukas Juhas | https://unsplash.com/photos/brown-wooden-framed-beige-padded-chair-WcEowyGAItU | https://images.unsplash.com/photo-1506332088442-9e0024864f5d?auto=format&fit=max&w=1600&q=85 |
| `mesa-aurora` | Primaria | Patricia Rieder | https://unsplash.com/photos/coffee-tables-in-living-room-eefbT4f_1Ic | https://unsplash.com/photos/eefbT4f_1Ic/download?force=true |
| `mesa-siena` | Primaria | Clay Banks | https://unsplash.com/photos/round-dining-table-with-chairs-and-lighthouse-painting-u38d5-suSAU | https://images.unsplash.com/photo-1756470843828-617611d35cf6?auto=format&fit=max&w=1600&q=85 |
| `mesa-rio` | Primaria | Sebastian Morelli-Peyton | https://unsplash.com/photos/wooden-side-table-with-arched-cutout-and-plants-efhBw_BRimk | https://images.unsplash.com/photo-1766751447949-e33036ab09d6?auto=format&fit=max&w=1600&q=85 |
| `mesa-monte` | Primaria | Costa Live | https://unsplash.com/photos/wooden-dining-table-and-chairs-with-grey-upholstery-T_CYjDSfvkY | https://images.unsplash.com/photo-1758977403865-f79e156415b3?auto=format&fit=max&w=1600&q=85 |
| `poltrona-siena` | Primaria | Annie Spratt | https://unsplash.com/photos/beige-armchair-KM4DlEItBFk | https://unsplash.com/photos/KM4DlEItBFk/download?force=true |
| `poltrona-siena` | Secundaria | David Sjunnesson | https://unsplash.com/photos/beige-armchair-JaC8Yf6fYGk | https://unsplash.com/photos/JaC8Yf6fYGk/download?force=true |
| `poltrona-roma` | Primaria | Olena Bohovyk | https://unsplash.com/photos/a-chair-with-a-blanket-on-it-next-to-a-vase-with-flowers-_ITQJtPxkJk | https://images.unsplash.com/photo-1634148737510-727f137375e0?auto=format&fit=max&w=1600&q=85 |
| `poltrona-nube` | Primaria | Alina Bondar | https://unsplash.com/photos/a-light-colored-armchair-with-a-cushion-on-wooden-floor-7mmmEkyk0aQ | https://images.unsplash.com/photo-1763279934323-edb3735f6a6e?auto=format&fit=max&w=1600&q=85 |
| `mesa-noche-alba` | Primaria | Aleksandra Dementeva | https://unsplash.com/photos/a-bedside-table-with-a-lamp-and-a-round-mirror-qKEhaiVI13U | https://unsplash.com/photos/qKEhaiVI13U/download?force=true |
| `mesa-noche-lino` | Primaria | Marina Nazina | https://unsplash.com/photos/modern-bedside-table-with-open-book-X0JT2EYZFJg | https://images.unsplash.com/photo-1765766602624-861292c3bc8f?auto=format&fit=max&w=1600&q=85 |
| `consola-verona` | Primaria | Ember Navarro | https://unsplash.com/photos/wooden-console-table-with-decor-5CnQ4cPCQps | https://images.unsplash.com/photo-1624304314520-8acb626f91f9?auto=format&fit=max&w=1600&q=85 |
| `biblioteca-roble` | Primaria | Jon Tyson | https://unsplash.com/photos/boxes-and-mugs-on-brown-wooden-floating-shelves-SOGFLZHjtzg | https://unsplash.com/photos/SOGFLZHjtzg/download?force=true |
| `espejo-arcadia` | Primaria | Milada Vigerova | https://unsplash.com/photos/round-mirror-with-black-strap-pdZ2BwpLyis | https://unsplash.com/photos/pdZ2BwpLyis/download?force=true |
| `repisa-savia` | Primaria | Nathan Dumlao | https://unsplash.com/photos/books-pot-of-plant-globe-and-moka-pot-on-wooden-floating-shelves-sQhy8CR5w_U | https://unsplash.com/photos/sQhy8CR5w_U/download?force=true |
| `biombo-oliva` | Primaria | Jelezniac Bianca | https://unsplash.com/photos/white-and-brown-wooden-room-divider-zcsrbottKew | https://unsplash.com/photos/zcsrbottKew/download?force=true |
