"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDietTargets } from "./actions";

export type DietTargets = {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export function DietTargetsDialog({ current }: { current: DietTargets }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground" />
      }>
        <Settings2 className="h-4 w-4" />
        <span className="sr-only">Edit targets</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Daily targets</DialogTitle>
        </DialogHeader>
        {open && <TargetsForm current={current} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function TargetsForm({
  current,
  onClose,
}: {
  current: DietTargets;
  onClose: () => void;
}) {
  const router = useRouter();
  const [kcal, setKcal] = useState(String(current.kcal));
  const [protein, setProtein] = useState(String(current.proteinG));
  const [fat, setFat] = useState(String(current.fatG));
  const [carbs, setCarbs] = useState(String(current.carbsG));
  const [pending, startTransition] = useTransition();

  function submit() {
    const vals = {
      dietKcalTarget: Number(kcal),
      dietProteinGTarget: Number(protein),
      dietFatGTarget: Number(fat),
      dietCarbsGTarget: Number(carbs),
    };
    if (Object.values(vals).some((v) => !Number.isFinite(v) || v <= 0)) {
      toast.error("All values must be positive numbers");
      return;
    }
    startTransition(async () => {
      const res = await updateDietTargets(vals);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Targets updated");
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dt-kcal">Calories (kcal)</Label>
          <Input
            id="dt-kcal"
            type="number"
            min="1"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dt-protein">Protein (g)</Label>
          <Input
            id="dt-protein"
            type="number"
            min="1"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dt-fat">Fat (g)</Label>
          <Input
            id="dt-fat"
            type="number"
            min="1"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dt-carbs">Carbs (g)</Label>
          <Input
            id="dt-carbs"
            type="number"
            min="1"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
