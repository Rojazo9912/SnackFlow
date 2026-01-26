import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface RealtimeOptions {
    onNewOrder?: (order: any) => void;
    onOrderUpdate?: (order: any) => void;
    onProductUpdate?: (product: any) => void;
    enabled?: boolean;
}

export function useRealtimeNotifications({ onNewOrder, onOrderUpdate, onProductUpdate, enabled = true }: RealtimeOptions = {}) {
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!enabled) return;

        // Use the singleton Supabase client
        const channel = supabase
            .channel('orders_realtime')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'orders' },
                (payload: any) => {
                    // Only trigger if status is pending, OR let the callback decide
                    // For now, keep original behavior of filtering for pending, but maybe better to just pass all new orders
                    if (payload.new.status === 'pending') {
                        onNewOrder?.(payload.new);
                    }
                }
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'orders' },
                (payload: any) => onOrderUpdate?.(payload.new)
            )
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'products' },
                (payload: any) => {
                    const newProduct = payload.new;
                    onProductUpdate?.(newProduct);

                    if (newProduct.stock <= newProduct.min_stock) {
                        // Dispatch custom event for low stock to be handled by global toast or header
                        window.dispatchEvent(new CustomEvent('low-stock-alert', { detail: newProduct }));
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') setIsConnected(true);
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
            setIsConnected(false);
        };
    }, [enabled, onNewOrder, onOrderUpdate, onProductUpdate]);

    return { isConnected };
}
