import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Edit2 } from 'lucide-react';

interface AdminEditPercentagesProps {
  documentId: string;
  currentSimilarity: number | null;
  currentAI: number | null;
  onUpdate: () => void;
}

export const AdminEditPercentages: React.FC<AdminEditPercentagesProps> = ({
  documentId,
  currentSimilarity,
  currentAI,
  onUpdate,
}) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [similarity, setSimilarity] = useState<string>(currentSimilarity?.toString() || '');
  const [ai, setAI] = useState<string>(currentAI?.toString() || '');

  const handleOpen = () => {
    setSimilarity(currentSimilarity?.toString() || '');
    setAI(currentAI?.toString() || '');
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, number | null> = {};
      
      // Parse similarity
      if (similarity.trim() !== '') {
        const simVal = parseFloat(similarity);
        if (!isNaN(simVal) && simVal >= 0 && simVal <= 100) {
          updates.similarity_percentage = simVal;
        }
      } else {
        updates.similarity_percentage = null;
      }

      // Parse AI
      if (ai.trim() !== '') {
        const aiVal = parseFloat(ai);
        if (!isNaN(aiVal) && aiVal >= 0 && aiVal <= 100) {
          updates.ai_percentage = aiVal;
        }
      } else {
        updates.ai_percentage = null;
      }

      const { error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', documentId);

      if (error) throw error;

      toast.success('Percentages updated successfully');
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating percentages:', error);
      toast.error('Failed to update percentages');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="h-8 px-2"
      >
        <Edit2 className="h-3 w-3 mr-1" />
        Edit %
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Similarity & AI Percentages</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Similarity Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={similarity}
                onChange={(e) => setSimilarity(e.target.value)}
                placeholder="e.g., 25.5"
              />
            </div>

            <div className="space-y-2">
              <Label>AI Percentage (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={ai}
                onChange={(e) => setAI(e.target.value)}
                placeholder="e.g., 10.2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
