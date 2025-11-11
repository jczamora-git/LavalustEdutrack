import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ConfirmOptions = {
  title?: string;
  description?: string;
  emphasis?: string; // Bold/emphasized part (e.g., student name and ID)
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
};

type ConfirmContextValue = {
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const confirm = (options: string | ConfirmOptions = {}) => {
    // Allow passing a string as the description for backward compatibility
    const normalizedOptions: ConfirmOptions = typeof options === 'string' 
      ? { description: options }
      : options;
    
    setOpts(normalizedOptions);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  };

  const handleClose = () => {
    setOpen(false);
    if (resolver) {
      resolver(false);
      setResolver(null);
    }
  };

  const handleConfirm = () => {
    setOpen(false);
    if (resolver) {
      resolver(true);
      setResolver(null);
    }
  };

  const isDestructive = opts.variant === 'destructive';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-md p-0 border-0 shadow-2xl overflow-hidden">
          {/* Gradient header with title */}
          <div className={`px-6 py-6 text-white ${
            isDestructive
              ? 'bg-gradient-to-r from-red-500 to-rose-500'
              : 'bg-gradient-to-r from-primary to-accent'
          }`}>
            <h2 className="text-xl font-bold">{opts.title ?? 'Confirm action'}</h2>
          </div>

          {/* White body with description */}
          <div className="px-6 py-5 bg-white">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {opts.description && (
                <>
                  {opts.emphasis ? (
                    <>
                      {opts.description.split(opts.emphasis)[0]}
                      <span className="font-bold text-foreground">{opts.emphasis}</span>
                      {opts.description.split(opts.emphasis)[1]}
                    </>
                  ) : (
                    opts.description
                  )}
                </>
              ) || 'Are you sure you want to continue?'}
            </p>
          </div>

          {/* Button footer */}
          <div className="flex gap-3 justify-end px-6 py-4 bg-muted/30 border-t border-border">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="font-semibold px-5 py-2"
            >
              {opts.cancelText ?? 'Cancel'}
            </Button>
            <Button 
              onClick={handleConfirm}
              className={`font-semibold px-5 py-2 text-white ${
                isDestructive
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600'
                  : 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90'
              }`}
            >
              {opts.confirmText ?? 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
};

export default ConfirmProvider;
