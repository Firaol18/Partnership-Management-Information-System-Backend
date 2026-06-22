import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  SerializeOptions,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, SearchEmployeeDto, UpdateEmployeeDto } from './dto';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmployeeAuthGuard } from '../../common/guards/employee-auth.guard';
import { Resource } from '../../common/decorators/resource.decorator';
import { RESOURCE } from '../../common/constants/resource';
import { ACTIONS } from '../../common/constants/actions';
import { EmployeeResponseDto } from './dto';
import {
  ChangeEmployeePasswordDto,
  ChangeOtherEmployeePasswordDto,
} from './dto/change-employee-password.dto';
import {
  ActivateEmployeeDto,
  DeactivateEmployeeDto,
} from './dto/employee-activation.dto';

@ApiTags('Employee Management')
@Controller('employee')
@UseGuards(EmployeeAuthGuard)
@ApiBearerAuth()
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.CREATE] }])
  @ApiResponse({
    status: 201,
    description: 'Employee created successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username, phone number, or email already exists',
  })
  create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Request() request: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.create(createEmployeeDto, request);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.READ] }])
  @ApiResponse({
    status: 200,
    description: 'Employees retrieved successfully',
    type: [EmployeeResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  findAll(
    @Request() request: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto[]> {
    return this.employeeService.findAll(request);
  }

  @Get('paginated')
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.READ] }])
  findAllPaginated(@Query() payload: SearchEmployeeDto) {
    return this.employeeService.findAllPaginated(payload);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.READ_ONE] }])
  @ApiResponse({
    status: 200,
    description: 'Employee retrieved successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  findOne(
    @Param('id') id: string,
    @Request() request: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.findOne(id, request);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.UPDATE] }])
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username, phone number, or email already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() request: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.update(id, updateEmployeeDto, request);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.DELETE] }])
  @ApiResponse({
    status: 204,
    description: 'Employee deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  remove(
    @Param('id') id: string,
    @Request() request: EmployeeTokenClaim,
  ): Promise<void> {
    return this.employeeService.remove(id, request);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  changePassword(
    @Body() changePasswordEmployeeDto: ChangeEmployeePasswordDto,
    @Request() request: EmployeeTokenClaim,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.changePassword(
      changePasswordEmployeeDto,
      request,
    );
  }

  @Post('change-employee-password')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @ApiResponse({
    status: 200,
    description: 'Employee updated successfully',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Employee not found',
  })
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.UPDATE] }])
  changeEmployeePassword(
    @Body() changeOtherEmployeePasswordDto: ChangeOtherEmployeePasswordDto,
  ): Promise<EmployeeResponseDto> {
    return this.employeeService.changeOtherEmployeePassword(
      changeOtherEmployeePasswordDto,
    );
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.CLOSE] }])
  activateEmployee(
    @Param('id') id: string,
    @Body() dto: ActivateEmployeeDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.employeeService.activateEmployee(id, dto, request);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Resource([{ resource: RESOURCE.EMPLOYEE, actions: [ACTIONS.CLOSE] }])
  deactivateEmployee(
    @Param('id') id: string,
    @Body() dto: DeactivateEmployeeDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.employeeService.deactivateEmployee(id, dto, request);
  }
}
