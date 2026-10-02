import { IsNotEmpty, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveMarkDto {
  @ApiProperty({ example: 'uuid-exam-id' })
  @IsNotEmpty()
  @IsString()
  examId: string;

  @ApiProperty({ example: 'uuid-student-id' })
  @IsNotEmpty()
  @IsString()
  studentId: string;

  @ApiProperty({ example: 'uuid-subject-id' })
  @IsNotEmpty()
  @IsString()
  subjectId: string;

  @ApiProperty({ example: 62.5 })
  @IsNumber()
  @Min(0)
  @Max(100)
  cqMarks: number;

  @ApiProperty({ example: 28.0 })
  @IsNumber()
  @Min(0)
  @Max(50)
  mcqMarks: number;

  @ApiProperty({ example: 0.0 })
  @IsNumber()
  @Min(0)
  @Max(50)
  pracMarks: number;
}
