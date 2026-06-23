import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PartnerService } from './partner.service';
import { CreatePartnerDto, UpdatePartnerDto, SearchPartnerDto } from './dto';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';

@ApiTags('Partner')
@ApiBearerAuth()
@Controller('partner')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Post()
  @Resource([{ resource: RESOURCE.PARTNER, actions: [ACTIONS.CREATE] }])
  @ApiResponse({ status: 201, description: 'Partner created successfully' })
  @ApiResponse({ status: 409, description: 'Partner with that name already exists' })
  create(@Body() createDto: CreatePartnerDto) {
    return this.partnerService.create(createDto);
  }

  @Get('paginated')
  @Resource([{ resource: RESOURCE.PARTNER, actions: [ACTIONS.READ] }])
  @ApiResponse({ status: 200, description: 'Paginated list of partners' })
  findAllPaginated(@Query() searchDto: SearchPartnerDto) {
    return this.partnerService.findAllPaginated(searchDto);
  }

  @Get(':id')
  @Resource([{ resource: RESOURCE.PARTNER, actions: [ACTIONS.READ_ONE] }])
  @ApiResponse({ status: 200, description: 'Partner detail' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  findOne(@Param('id') id: string) {
    return this.partnerService.findOne(id);
  }

  @Patch(':id')
  @Resource([{ resource: RESOURCE.PARTNER, actions: [ACTIONS.UPDATE] }])
  @ApiResponse({ status: 200, description: 'Partner updated successfully' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  @ApiResponse({ status: 409, description: 'Partner with that name already exists' })
  update(@Param('id') id: string, @Body() updateDto: UpdatePartnerDto) {
    return this.partnerService.update(id, updateDto);
  }

  @Delete(':id')
  @Resource([{ resource: RESOURCE.PARTNER, actions: [ACTIONS.DELETE] }])
  @ApiResponse({ status: 200, description: 'Partner deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete partner linked to engagements' })
  @ApiResponse({ status: 404, description: 'Partner not found' })
  remove(@Param('id') id: string) {
    return this.partnerService.remove(id);
  }
}
