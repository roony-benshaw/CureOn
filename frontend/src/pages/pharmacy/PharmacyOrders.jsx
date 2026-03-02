import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  History,
  Settings,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Printer,
  FileText,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appointmentsService } from "@/services/api";

const formatINR = (value) => {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
  } catch {
    return `₹${Number(value || 0).toFixed(2)}`;
  }
};

const navItems = [
  { name: "Dashboard", href: "/pharmacy/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/pharmacy/orders", icon: ClipboardList },
  { name: "Inventory", href: "/pharmacy/inventory", icon: Package },
  { name: "History", href: "/pharmacy/history", icon: History },
  { name: "Settings", href: "/pharmacy/settings", icon: Settings },
];

const PharmacyOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    patientName: "",
    doctorName: "",
    medication: "",
    quantity: "",
    price: ""
  });

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingOrder, setBillingOrder] = useState(null);
  const [billingItems, setBillingItems] = useState([]);
  const [billingAttachment, setBillingAttachment] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await appointmentsService.prescriptions.listPharmacy();
        // Map backend prescriptions to list items
        const mapped = (res || []).map(p => ({
          id: p.id,
          displayId: `ORD-${String(p.id).padStart(3, '0')}`,
          patientName: p.patient_name,
          doctorName: `Dr. ${p.doctor_name}`,
          date: new Date(p.created_at).toISOString().split('T')[0],
          time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: (() => {
            const raw = (p.pharmacy_status || 'PENDING').toLowerCase();
            return raw.charAt(0).toUpperCase() + raw.slice(1);
          })(),
          items: (p.items || []).map(m => ({
            id: m.id,
            name: m.name,
            quantity: m.quantity || 0,
            price: m.unit_price != null ? formatINR(m.unit_price) : ''
          })),
          total: p.total_amount != null ? formatINR(p.total_amount) : ''
        }));
        setOrders(mapped);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStatusChange = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    toast.success(`Order ${orderId} status updated to ${newStatus}`);
  };

  const handleCreateOrder = () => {
    const newId = `ORD-${String(orders.length + 1).padStart(3, '0')}`;
    const currentDate = new Date();
    const order = {
      id: newId,
      patientName: newOrder.patientName,
      doctorName: newOrder.doctorName,
      date: currentDate.toISOString().split('T')[0],
      time: currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Pending",
      items: [
        { 
          name: newOrder.medication, 
          quantity: newOrder.quantity, 
          price: `$${newOrder.price}` 
        }
      ],
      total: `$${newOrder.price}`
    };

    setOrders([order, ...orders]);
    setIsNewOrderOpen(false);
    setNewOrder({
      patientName: "",
      doctorName: "",
      medication: "",
      quantity: "",
      price: ""
    });
    toast.success("New order created successfully");
  };

  const handlePrint = () => {
    toast.success("Printing order list...");
    // In a real app, this would trigger window.print() or generate a PDF
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Processing":
        return "bg-blue-100 text-blue-800";
      case "Ready":
        return "bg-green-100 text-green-800";
      case "Completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesSearch =
      order.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.displayId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === "All" || order.status === statusFilter;
    return matchesSearch && matchesFilter;
  }), [orders, searchTerm, statusFilter]);

  return (
    <DashboardLayout navItems={navItems} userType="pharmacy">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
              Medication Orders
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and process patient prescriptions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print List
            </Button>
            <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
              <DialogTrigger asChild>
                <Button variant="hero">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new prescription order.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="patient" className="text-right">
                      Patient
                    </Label>
                    <Input
                      id="patient"
                      value={newOrder.patientName}
                      onChange={(e) => setNewOrder({...newOrder, patientName: e.target.value})}
                      className="col-span-3"
                      placeholder="Patient Name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="doctor" className="text-right">
                      Doctor
                    </Label>
                    <Input
                      id="doctor"
                      value={newOrder.doctorName}
                      onChange={(e) => setNewOrder({...newOrder, doctorName: e.target.value})}
                      className="col-span-3"
                      placeholder="Dr. Name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="medication" className="text-right">
                      Medication
                    </Label>
                    <Input
                      id="medication"
                      value={newOrder.medication}
                      onChange={(e) => setNewOrder({...newOrder, medication: e.target.value})}
                      className="col-span-3"
                      placeholder="Medication Name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quantity" className="text-right">
                      Quantity
                    </Label>
                    <Input
                      id="quantity"
                      value={newOrder.quantity}
                      onChange={(e) => setNewOrder({...newOrder, quantity: e.target.value})}
                      className="col-span-3"
                      placeholder="e.g. 10 tabs"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="price" className="text-right">
                      Price ($)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={newOrder.price}
                      onChange={(e) => setNewOrder({...newOrder, price: e.target.value})}
                      className="col-span-3"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateOrder}>Create Order</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or order ID..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {["All", "Pending", "Processing", "Ready", "Completed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card rounded-xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Order Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium text-muted-foreground">
                        {order.displayId}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg">{order.patientName}</h3>
                    <p className="text-sm text-muted-foreground">
                      Prescribed by {order.doctorName} • {order.date} at {order.time}
                    </p>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 lg:mx-8">
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium">{item.name}</span>
                          <div className="flex gap-4 text-muted-foreground">
                            <span>{item.quantity ? `${item.quantity} tabs` : ""}</span>
                            <span>{item.price}</span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-sm">
                        <span>Total</span>
                        <span>{order.total}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Printer className="w-4 h-4 mr-2" />
                          Print Label
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {order.status === "Pending" && (
                      <Button size="sm" variant="hero" onClick={async () => {
                        try {
                          await appointmentsService.prescriptions.updatePharmacyStatus(order.id, "PROCESSING");
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Processing" } : o));
                          toast.success("Status updated to Processing");
                        } catch {}
                      }}>Start Processing</Button>
                    )}
                    {order.status === "Processing" && (
                      <Button size="sm" variant="hero" className="bg-green-600 hover:bg-green-700" onClick={async () => {
                        try {
                          await appointmentsService.prescriptions.updatePharmacyStatus(order.id, "READY");
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Ready" } : o));
                          toast.success("Marked Ready");
                        } catch {}
                      }}>
                        Mark Ready
                      </Button>
                    )}
                    {order.status === "Ready" && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          await appointmentsService.prescriptions.updatePharmacyStatus(order.id, "COMPLETED");
                          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Completed" } : o));
                          toast.success("Marked Completed");
                        } catch {}
                      }}>
                        Mark Picked Up
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => {
                      setBillingOrder(order);
                      setBillingItems(order.items.map((it) => ({
                        id: it.id,
                        name: it.name,
                        quantity: Number(it.quantity) || 0,
                        unit_price: it.price ? Number(String(it.price).replace(/[^0-9.]/g, "")) : 0
                      })));
                      setBillingOpen(true);
                    }}>
                      Add Bill
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No orders found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
      {/* Billing Dialog */}
      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Bill</DialogTitle>
            <DialogDescription>
              Set quantity and unit price for each medicine
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {billingItems.map((bi, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-6">
                  <Label>Item</Label>
                  <Input value={bi.name} readOnly />
                </div>
                <div className="col-span-3">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={bi.quantity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBillingItems(prev => prev.map((x, idx) => idx === i ? { ...x, quantity: v } : x));
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={bi.unit_price}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setBillingItems(prev => prev.map((x, idx) => idx === i ? { ...x, unit_price: v } : x));
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3 mt-2">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">
                {formatINR(billingItems.reduce((sum, x) => sum + (Number(x.quantity) * Number(x.unit_price)), 0))}
              </span>
            </div>
            <div className="pt-2">
              <Label>Attach Bill (PDF/Image)</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={(e) => setBillingAttachment(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={async () => {
              if (!billingOrder) return;
              try {
                const payload = billingItems.map(x => ({ id: x.id, quantity: x.quantity, unit_price: x.unit_price }));
                const updated = await appointmentsService.prescriptions.updatePharmacyBill(billingOrder.id, payload, billingAttachment);
                setOrders(prev => prev.map(o => o.id === billingOrder.id ? {
                  ...o,
                  items: (updated.items || []).map(m => ({
                    name: m.name,
                    quantity: m.quantity,
                    price: formatINR(m.unit_price)
                  })),
                  total: formatINR(updated.total_amount || 0)
                } : o));
                toast.success("Bill updated");
                setBillingOpen(false);
                setBillingAttachment(null);
              } catch {
                toast.error("Failed to update bill");
              }
            }}>
              Save Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PharmacyOrders;
