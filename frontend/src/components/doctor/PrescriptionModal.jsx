import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pill } from "lucide-react";
import { toast } from "sonner";

const PrescriptionModal = ({ open, onOpenChange, appointment, onSubmit }) => {
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState([
    { name: "", dosage: "", frequency: "", duration: "" }
  ]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleRemoveMedicine = (index) => {
    const newMedicines = medicines.filter((_, i) => i !== index);
    setMedicines(newMedicines);
  };

  const handleMedicineChange = (index, field, value) => {
    const newMedicines = [...medicines];
    newMedicines[index][field] = value;
    setMedicines(newMedicines);
  };

  const handleSubmit = async () => {
    if (!diagnosis) {
      toast.error("Please enter a diagnosis");
      return;
    }

    if (medicines.some(m => !m.name)) {
      toast.error("Please specify medicine names");
      return;
    }

    setSubmitting(true);
    try {
      const { appointmentsService } = await import("@/services/api");
      const payload = {
        diagnosis,
        items: medicines.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
        })),
        notes,
      };
      const result = await appointmentsService.prescriptions.create(appointment.id, payload);
      toast.success("Prescription sent successfully");
      if (onSubmit) {
        await onSubmit(result);
      }
      onOpenChange(false);
      setDiagnosis("");
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }]);
      setNotes("");
    } catch (error) {
      const detail =
        error?.response?.data?.detail ||
        (Array.isArray(error?.response?.data?.non_field_errors) ? error.response.data.non_field_errors.join(", ") : null) ||
        (typeof error?.response?.data === "string" ? error.response.data : null);
      const firstItemError = (() => {
        const itemsErr = error?.response?.data?.items;
        if (Array.isArray(itemsErr) && itemsErr.length > 0) {
          const e0 = itemsErr[0];
          if (typeof e0 === "string") return e0;
          if (e0 && typeof e0 === "object") {
            const keys = Object.keys(e0);
            if (keys.length > 0 && Array.isArray(e0[keys[0]])) return e0[keys[0]].join(", ");
          }
        }
        return null;
      })();
      toast.error(detail || firstItemError || "Failed to submit prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Write Prescription for {appointment?.patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input 
              id="diagnosis" 
              placeholder="e.g. Acute Bronchitis" 
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Medicines</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddMedicine}>
                <Plus className="w-4 h-4 mr-2" />
                Add Medicine
              </Button>
            </div>

            {medicines.map((medicine, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-3 rounded-lg">
                <div className="col-span-4 space-y-1">
                  <Label className="text-xs">Medicine Name</Label>
                  <Input 
                    placeholder="Name" 
                    value={medicine.name}
                    onChange={(e) => handleMedicineChange(index, "name", e.target.value)}
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <Label className="text-xs">Dosage</Label>
                  <Input 
                    placeholder="e.g. 500mg" 
                    value={medicine.dosage}
                    onChange={(e) => handleMedicineChange(index, "dosage", e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Freq</Label>
                  <Input 
                    placeholder="1-0-1" 
                    value={medicine.frequency}
                    onChange={(e) => handleMedicineChange(index, "frequency", e.target.value)}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Duration</Label>
                  <Input 
                    placeholder="5 days" 
                    value={medicine.duration}
                    onChange={(e) => handleMedicineChange(index, "duration", e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveMedicine(index)}
                    disabled={medicines.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea 
              id="notes" 
              placeholder="Instructions, advice, or follow-up details..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="hero" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Prescribing..." : "Submit Prescription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionModal;
