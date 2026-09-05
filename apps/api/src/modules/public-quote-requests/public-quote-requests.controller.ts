import { Body, Controller, Post } from '@nestjs/common';
import { CreatePublicQuoteRequestDto } from './dto/public-quote-request.dto';
import { PublicQuoteRequestsService } from './public-quote-requests.service';

@Controller('public/quote-requests')
export class PublicQuoteRequestsController {
  constructor(private readonly requests: PublicQuoteRequestsService) {}

  @Post()
  create(@Body() body: CreatePublicQuoteRequestDto) {
    return this.requests.create(body);
  }
}
