import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
    constructor(private readonly filesService: FilesService) { }

    @Post('upload-logo')
    @ApiOperation({ summary: 'Subir logo del negocio' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('file'))
    async uploadLogo(
        @CurrentUser('tenantId') tenantId: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
                    new FileTypeValidator({ fileType: /image\/(png|jpeg|jpg|webp)/ }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        return this.filesService.uploadLogo(file, tenantId);
    }
}
