import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
    constructor(
        @Inject(SUPABASE_CLIENT)
        private readonly supabase: SupabaseClient,
    ) { }

    async uploadLogo(file: Express.Multer.File, tenantId: string) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${tenantId}/${uuidv4()}.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { data, error } = await this.supabase.storage
            .from('logos')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });

        if (error) {
            throw new Error(`Error subiendo archivo: ${error.message}`);
        }

        const { data: { publicUrl } } = this.supabase.storage
            .from('logos')
            .getPublicUrl(fileName);

        return { url: publicUrl };
    }
}
