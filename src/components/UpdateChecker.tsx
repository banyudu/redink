import { useState } from 'react';
import { Button } from './ui/button';
import { checkForUpdates, checkForUpdatesQuietly } from '@/lib/updater';
import { RefreshCw } from 'lucide-react';

/**
 * Component to check for app updates
 */
export function UpdateChecker() {
  const [checking, setChecking] = useState(false);
  const [hasUpdate, setHasUpdate] = useState<boolean | null>(null);

  const handleCheckUpdates = async () => {
    setChecking(true);
    setHasUpdate(null);
    
    try {
      // First check quietly to see if update is available
      const updateAvailable = await checkForUpdatesQuietly();
      setHasUpdate(updateAvailable);
      
      // If update is available, trigger the full update flow with dialog
      if (updateAvailable) {
        await checkForUpdates();
      }
    } catch (error) {
      console.error('[UpdateChecker]', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleCheckUpdates}
        disabled={checking}
        variant="outline"
        size="sm"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
        {checking ? 'Checking...' : 'Check for Updates'}
      </Button>
      
      {hasUpdate === false && !checking && (
        <span className="text-sm text-muted-foreground">
          You're up to date!
        </span>
      )}
    </div>
  );
}

