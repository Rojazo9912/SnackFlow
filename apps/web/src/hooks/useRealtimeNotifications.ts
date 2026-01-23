import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface RealtimeOptions {
    onNewOrder?: (order: any) => void;
    enabled?: boolean;
}

export function useRealtimeNotifications({ onNewOrder, enabled = true }: RealtimeOptions = {}) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!enabled) return;

        // Use the singleton Supabase client
        const channel = supabase
            .channel('orders')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders', filter: 'status=eq.pending' },
                (payload: any) => onNewOrder?.(payload.new)
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled, onNewOrder]);

    return { isConnected: !!channelRef.current };
}
