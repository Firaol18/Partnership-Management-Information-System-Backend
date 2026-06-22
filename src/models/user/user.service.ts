import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import {
  CreateUserDto,
  SearchUserDto,
  UpdateMyProfileDto,
  UpdateUserDto,
} from './dto';
import { paginate } from '../../common/utils/paginater';
import { EmployeeTokenClaim } from '../../common/interfaces/employee-login.interface';
import { TokenClaim } from '../../common/interfaces/login.interface';
import { SignupResponseDto } from '../auth/auth/dto';
import { PasswordService } from '../../common/services/password.service';
import { AuthAuditService } from '../../common/services/auth-audit.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly passwordService: PasswordService,
    private readonly authAuditService: AuthAuditService,
  ) {}

  // Flow A: Normal signup with OTP
  async create(
    createUserDto: CreateUserDto,
    ipAddress: string,
    request: EmployeeTokenClaim,
    userAgent?: string,
  ): Promise<SignupResponseDto> {
    const passwordValidation = this.passwordService.validatePassword(
      createUserDto.password,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: createUserDto.username },
          { phone_number: createUserDto.phone_number },
          ...(createUserDto.email ? [{ email: createUserDto.email }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(
      createUserDto.password,
    );

    // Create user (unverified)
    const user = await this.prisma.user.create({
      data: {
        user_type: 'INDIVIDUAL',
        id_type: 'GOVERNMENT_ID',
        name: createUserDto.name,
        username: createUserDto.username,
        password: hashedPassword,
        phone_number: createUserDto.phone_number,
        email: createUserDto.email || null,
        username_verified: false,
        is_active: true,
        require_password_change: true,
        created_by_id: request.user.sub,
        admin_created: true,
      },
    });

    // Log successful signup
    await this.authAuditService.logSignup(
      user.id,
      createUserDto.username,
      'success',
      ipAddress,
      userAgent,
    );

    return {
      message: 'User created successfully',
    };
  }

  async findAllPaginated(options: SearchUserDto) {
    const { search } = { ...options };
    const where: any = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        { username: search },
        { phone_number: search },
      ];
    }

    return paginate(
      this.prisma.user,
      {
        where,
        orderBy: { created_at: 'desc' },
        omit: { password: true, code_hash: true },
      },
      { page: options.page, perPage: options.limit },
    );
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: true, code_hash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOneByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      omit: { password: true, code_hash: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    request: EmployeeTokenClaim,
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.phone_number) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone_number: updateUserDto.phone_number,
          id: { not: id },
        },
      });

      if (existingPhone) {
        throw new ConflictException(
          'User with this phone number already exists',
        );
      }
    }

    if (updateUserDto.username) {
      const existingUsername = await this.prisma.user.findFirst({
        where: {
          username: updateUserDto.username,
          id: { not: id },
        },
      });

      if (existingUsername) {
        throw new ConflictException('User with this username already exists');
      }
    }

    if (updateUserDto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updateData: any = { ...updateUserDto };

    return await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
      },
    });
  }

  async updateMyProfile(
    updateUserDto: UpdateMyProfileDto,
    request: TokenClaim,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.phone_number) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone_number: updateUserDto.phone_number,
          id: { not: user.id },
        },
      });

      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    if (updateUserDto.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email,
          id: { not: user.id },
        },
      });

      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    const updateData: any = {
      name: updateUserDto.name || user.name,
      phone_number: updateUserDto.phone_number || user.phone_number,
      email: updateUserDto.email || user.email,
    };

    return await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
      },
    });
  }
}
