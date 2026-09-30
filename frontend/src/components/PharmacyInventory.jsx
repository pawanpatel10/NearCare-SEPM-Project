import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import Navbar from "./Navbar";

export default function PharmacyInventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Prevent duplicate submissions

  // State for "Add Manual" Form
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    dosage: "", // e.g., 500mg
    price: "",
    stock: "",
    expiry: "",
    type: "Tablet", // Default
  });

  // 1. Listen to Real-Time Inventory Updates
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return navigate("/login");

    const q = query(
      collection(db, "pharmacy_inventory"),
      where("pharmacyId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const inventoryList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(inventoryList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 2. Handle Manual Add
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || saving) return;

    setSaving(true);

    try {
      await addDoc(collection(db, "pharmacy_inventory"), {
        ...newItem,
        name_lower: newItem.name.trim().toLowerCase(),
        pharmacyId: auth.currentUser.uid,
        price: Number(newItem.price),
        stock: Number(newItem.stock),
        updatedAt: new Date(),
      });
      setShowForm(false);
      setNewItem({
        name: "",
        dosage: "",
        price: "",
        stock: "",
        expiry: "",
        type: "Tablet",
      });
      alert("Medicine added!");
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add medicine. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // 3. Handle Delete (Remove Expired)
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this item?")) {
      await deleteDoc(doc(db, "pharmacy_inventory", id));
    }
  };

  // 4. Handle Quick Update (Price/Stock)
  const handleUpdate = async (id, field, value) => {
    const itemRef = doc(db, "pharmacy_inventory", id);
    await updateDoc(itemRef, {
      [field]: Number(value),
    });
  };

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header Section */}
        <div className="relative mb-6 animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/10 to-emerald-600/10 rounded-3xl blur-xl"></div>
          <div className="relative glass-card rounded-3xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📦</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    Inventory Management
                  </h1>
                  <p className="text-slate-500 text-sm">
                    Track stock, update prices, and remove expired items
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate("/inventory-scanner")}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 
                             text-white px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg 
                             hover:shadow-violet-500/25 hover:scale-105 active:scale-95 font-semibold"
                >
                  <span>📸</span> Scan with AI
                </button>

                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 
                             text-white px-5 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg 
                             hover:shadow-teal-500/25 hover:scale-105 active:scale-95 font-semibold"
                >
                  <span>➕</span> Add Manually
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- ADD NEW ITEM FORM (Toggleable) --- */}
        {showForm && (
          <div className="glass-card rounded-2xl p-6 mb-6 animate-fade-in-up border border-teal-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-sm">
                💊
              </span>
              Add New Medicine
            </h3>
            <form
              onSubmit={handleAddItem}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <input
                type="text"
                placeholder="Medicine Name (e.g. Dolo)"
                className="border-2 border-slate-200 p-3 rounded-xl bg-white/80 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                required
                value={newItem.name}
                onChange={(e) =>
                  setNewItem({ ...newItem, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Dosage (e.g. 650mg)"
                className="border-2 border-slate-200 p-3 rounded-xl bg-white/80 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                value={newItem.dosage}
                onChange={(e) =>
                  setNewItem({ ...newItem, dosage: e.target.value })
                }
              />
              <select
                className="border-2 border-slate-200 p-3 rounded-xl bg-white/80 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                value={newItem.type}
                onChange={(e) =>
                  setNewItem({ ...newItem, type: e.target.value })
                }
              >
                <option>Tablet</option>
                <option>Syrup</option>
                <option>Injection</option>
                <option>Cream</option>
                <option>Powder</option>
                <option>Drops</option>
                <option>Capsule</option>
              </select>

              <input
                type="number"
                placeholder="Price (₹)"
                className="border-2 border-slate-200 p-3 rounded-xl bg-white/80 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                required
                value={newItem.price}
                onChange={(e) =>
                  setNewItem({ ...newItem, price: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="Stock Quantity"
                className="border-2 border-slate-200 p-3 rounded-xl bg-white/80 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                required
                value={newItem.stock}
                onChange={(e) =>
                  setNewItem({ ...newItem, stock: e.target.value })
                }
              />
              <input
                type="date"
                placeholder="Expiry Date"
                className="border-2 border-slate-200 p-3 rounded-xl bg-white/80 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                value={newItem.expiry}
                onChange={(e) =>
                  setNewItem({ ...newItem, expiry: e.target.value })
                }
              />

              <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl 
                             font-semibold shadow-lg transition-all flex items-center gap-2
                             ${
                               saving
                                 ? "opacity-70 cursor-not-allowed"
                                 : "hover:from-teal-700 hover:to-emerald-700"
                             }`}
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Medicine"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- INVENTORY LIST TABLE --- */}
        <div
          className="glass-card rounded-2xl overflow-hidden animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 mx-auto border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500">Loading inventory...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <span className="text-4xl">📦</span>
              </div>
              <h3 className="text-slate-800 font-bold text-lg mb-2">
                Your Inventory is Empty
              </h3>
              <p className="text-slate-500 text-sm">
                Use the Scanner or Manual Add to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-600 text-sm uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-semibold">Medicine Name</th>
                    <th className="p-4 font-semibold">Type</th>
                    <th className="p-4 font-semibold">Stock (Qty)</th>
                    <th className="p-4 font-semibold">Price (₹)</th>
                    <th className="p-4 font-semibold">Expiry</th>
                    <th className="p-4 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      {/* Name & Dosage */}
                      <td className="p-4">
                        <div className="font-bold text-slate-800">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.dosage}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-4">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-100">
                          {item.type}
                        </span>
                      </td>

                      {/* Editable Stock */}
                      <td className="p-4">
                        <input
                          type="number"
                          defaultValue={item.stock}
                          onBlur={(e) =>
                            handleUpdate(item.id, "stock", e.target.value)
                          }
                          className="w-20 border-2 border-slate-200 rounded-lg px-2 py-1.5 text-center 
                                     focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Editable Price */}
                      <td className="p-4">
                        <div className="flex items-center">
                          <span className="text-slate-400 mr-1 font-medium">
                            ₹
                          </span>
                          <input
                            type="number"
                            defaultValue={item.price}
                            onBlur={(e) =>
                              handleUpdate(item.id, "price", e.target.value)
                            }
                            className="w-20 border-2 border-slate-200 rounded-lg px-2 py-1.5 
                                       focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:outline-none transition-all"
                          />
                        </div>
                      </td>

                      {/* Expiry Date (Highlight if expired) */}
                      <td className="p-4">
                        <div
                          className={`text-sm font-medium ${
                            new Date(item.expiry) < new Date()
                              ? "text-red-600"
                              : "text-slate-600"
                          }`}
                        >
                          {item.expiry || "N/A"}
                          {new Date(item.expiry) < new Date() && (
                            <span className="block text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded mt-1 inline-block">
                              EXPIRED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Delete Action */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-400 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-all"
                          title="Remove Item"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            ></path>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
