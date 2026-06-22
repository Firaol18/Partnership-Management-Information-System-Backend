import {
  Controller,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  SerializeOptions,
  Patch,
  Body,
  Request,
  Post,
  Ip,
  Headers,
} from '@nestjs/common';
import { UserService } from './user.service';
import { Resource } from '../../common/decorators/resource.decorator';
import { ACTIONS } from '../../common/constants/actions';
import {
  CreateUserDto,
  SearchUserDto,
  UpdateMyProfileDto,
  UpdateUserDto,
} from './dto';
import { ApiResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RESOURCE } from '../../common/constants/resource';
import { UserResponseDto, SignupResponseDto } from '../auth/auth/dto';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';
import { TokenClaim } from '../../common/interfaces/login.interface';

@ApiTags('user')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.USER, actions: [ACTIONS.CREATE] }])
  create(
    @Body() createUserDto: CreateUserDto,
    @Ip() ip,
    @Request() request: EmployeeTokenClaim,
    @Headers('user-agent') userAgent?: string,
  ): Promise<SignupResponseDto> {
    return this.userService.create(createUserDto, ip, request, userAgent);
  }

  @Get('paginated')
  @Resource([{ resource: RESOURCE.USER, actions: [ACTIONS.READ] }])
  findAllPaginated(@Query() payload: SearchUserDto) {
    return this.userService.findAllPaginated(payload);
  }

  @Get(':username/by-username')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.USER, actions: [ACTIONS.READ_ONE] }])
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  findByUsername(@Param('username') username: string) {
    return this.userService.findOneByUsername(username);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.USER, actions: [ACTIONS.READ_ONE] }])
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch('update-my-profile')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  updateMyProfile(
    @Body() updateUserDto: UpdateMyProfileDto,
    @Request() request: TokenClaim,
  ) {
    return this.userService.updateMyProfile(updateUserDto, request);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({
    groups: ['me'],
  })
  @Resource([{ resource: RESOURCE.USER, actions: [ACTIONS.UPDATE] }])
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Username, phone number, or email already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() request: EmployeeTokenClaim,
  ) {
    return this.userService.update(id, updateUserDto, request);
  }
}
