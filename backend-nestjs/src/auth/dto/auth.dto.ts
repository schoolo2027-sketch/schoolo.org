import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@school.edu.bd' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'admin@school.edu.bd' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin@12345' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Principal Md. Rafiqul Islam' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SCHOOL_ADMIN', enum: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT'] })
  @IsEnum(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT', 'PARENT'])
  role: string;

  @ApiProperty({ example: 'uuid-school-id' })
  @IsNotEmpty()
  schoolId: string;
}
