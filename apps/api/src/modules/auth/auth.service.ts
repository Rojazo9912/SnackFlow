import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../database/database.module';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Authenticate with Supabase
    const { data: authData, error: authError } =
      await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    // Get user profile with tenant info
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('*, tenants(id, name, slug)')
      .eq('id', authData.user.id)
      .single();

    if (userError || !user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenants,
      },
    };
  }

  async validatePin(userId: string, pin: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, pin, tenant_id, role, email, name')
      .eq('id', userId)
      .single();

    if (error || !user || !user.pin) {
      throw new UnauthorizedException('PIN invalido');
    }

    const isHashed = user.pin.startsWith('$2');
    const isValid = isHashed ? await bcrypt.compare(pin, user.pin) : user.pin === pin;

    if (!isValid) {
      throw new UnauthorizedException('PIN invalido');
    }

    // Upgrade legacy plain PINs to hashed
    if (!isHashed) {
      const hashed = await bcrypt.hash(pin, 10);
      await this.supabase
        .from('users')
        .update({ pin: hashed })
        .eq('id', userId);
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async logout(userId: string) {
    // Optionally invalidate session in database
    return { message: 'Sesion cerrada exitosamente' };
  }
}


