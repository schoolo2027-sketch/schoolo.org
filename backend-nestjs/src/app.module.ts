import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassesModule } from './classes/classes.module';
import { AttendanceModule } from './attendance/attendance.module';
import { MarksModule } from './marks/marks.module';
import { FeesModule } from './fees/fees.module';
import { NoticesModule } from './notices/notices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SchoolsModule,
    StudentsModule,
    TeachersModule,
    ClassesModule,
    AttendanceModule,
    MarksModule,
    FeesModule,
    NoticesModule,
  ],
})
export class AppModule {}
