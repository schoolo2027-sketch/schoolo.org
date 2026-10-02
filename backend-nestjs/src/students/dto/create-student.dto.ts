import { IsNotEmpty, IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'STU-2026-001' })
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiProperty({ example: 'মোঃ তানভীর হাসান' })
  @IsNotEmpty()
  @IsString()
  nameBn: string;

  @ApiProperty({ example: 'Md. Tanvir Hasan' })
  @IsNotEmpty()
  @IsString()
  nameEn: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  rollNumber: number;

  @ApiProperty({ example: 'uuid-class-id' })
  @IsNotEmpty()
  @IsString()
  classId: string;

  @ApiProperty({ example: 'uuid-section-id', required: false })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ example: '01711223344' })
  @IsNotEmpty()
  @IsString()
  guardianPhone: string;

  @ApiProperty({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'] })
  @IsEnum(['MALE', 'FEMALE', 'OTHER'])
  gender: 'MALE' | 'FEMALE' | 'OTHER';

  @ApiProperty({ example: 'uuid-fourth-subject-id', required: false })
  @IsOptional()
  @IsString()
  fourthSubjectId?: string;

  @ApiProperty({ example: 'Higher Math', required: false })
  @IsOptional()
  @IsString()
  optionalSubject?: string;

  @ApiProperty({ example: 'Physics, Chemistry, Biology', required: false })
  @IsOptional()
  @IsString()
  groupSubjects?: string;
}
