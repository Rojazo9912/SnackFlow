import { useEffect, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

interface RealtimeOptions {
    onNewOrder?: (order: any) => void;
    enabled?: boolean;
}

export function useRealtimeNotifications({ onNewOrder, enabled = true }: RealtimeOptions = {}) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const supabaseRef = useRef<any>(null);

    useEffect(() => {
        if (!enabled) return;

        const url = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

        supabaseRef.current = createClient(url, key);

        const channel = supabaseRef.current
            .channel('orders')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: 'status=eq.pending' },
                (payload: any) => onNewOrder?.(payload.new)
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabaseRef.current?.removeChannel(channel);
        };
    }, [enabled, onNewOrder]);

    return { isConnected: !!channelRef.current };
}
