import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * FIXED VERSION - A hook to call the registry_check Supabase Edge Function.
 * The registry_check function now handles EVERYTHING internally:
 * - Searches CompanyBook API (via proxy)
 * - Writes to user_registry_checks table
 * - Updates users_pending status
 * - Triggers users_pending_worker automatically
 * - Sends email notification
 * 
 * @returns {{ checkRegistry: (payload: {full_name: string, email: string}) => Promise<{success: boolean, data?: any}>, isLoading: boolean }}
 */
export const useRegistryCheck = () => {
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const checkRegistry = async (payload) => {
        setIsLoading(true);

        try {
            console.log('[Registry Check] Starting check for:', payload);
            
            // Call the registry_check function - it handles EVERYTHING
            const { data: registryData, error: registryError } = await supabase.functions.invoke('registry_check', {
                body: payload, // Send as object, not JSON.stringify
            });

            if (registryError) {
                console.error('[Registry Check] Error:', registryError);
                throw new Error(registryError.message || 'Registry check failed');
            }
            
            console.log('[Registry Check] Success:', registryData);
            
            // Show success message
            toast({
                title: "Успешна проверка",
                description: `Намерени ${registryData.match_count || 0} фирми. Проверете имейла си за детайли.`,
            });

            return { success: true, data: registryData };

        } catch (error) {
            console.error("[Registry Check] Exception:", error);
            
            toast({
                variant: "destructive",
                title: "Грешка при справка",
                description: "Възникна проблем при извършването на справка в регистъра. Моля, опитайте отново.",
            });
            
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    return { checkRegistry, isLoading };
};
