import { useState } from "react";
import { analyzeShelfImage } from "../services/aiService";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function InventoryScanner() {
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...scannedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setScannedItems(updatedItems);
  };

  const handleImageUpload = async (e) => {
    const originalFile = e.target.files[0];
    if (!originalFile) return;

    if (!originalFile.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    try {
      setLoading(true);
      console.log(
        `Original size: ${(originalFile.size / 1024 / 1024).toFixed(2)}MB`
      );

      const compressedFile = await compressImage(originalFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
      setImage(compressedFile);

      const result = await analyzeShelfImage(compressedFile);

      const normalizedResult = result.map((item) => ({
        name: item.name || "Unknown",
        dosage: item.dosage || "",
        type: item.type || "Tablet",
        stock: item.estimated_stock || 0,
        price: 0,
        expiry: "",
      }));

      if (normalizedResult.length === 0) {
        alert(
          "No medicines detected. Try a clearer image of the medicine labels."
        );
      }

      setScannedItems(normalizedResult);
    } catch (error) {
      console.error("Scan failed:", error);
      const errorMsg = error.message?.toLowerCase() || "";

      if (
        errorMsg.includes("too large") ||
        errorMsg.includes("size") ||
        errorMsg.includes("payload")
      ) {
        alert("Image is too large. Please try with a smaller image.");
      } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
        alert("Network error. Please check your internet connection.");
      } else {
        alert(`Scan failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToInventory = async () => {
    if (!auth.currentUser || saving) return;

    setSaving(true);

    try {
      const inventoryRef = collection(db, "pharmacy_inventory");

      const promises = scannedItems.map((item) =>
        addDoc(inventoryRef, {
          pharmacyId: auth.currentUser.uid,
          name: item.name,
          name_lower: item.name.trim().toLowerCase(),
          dosage: item.dosage,
          stock: Number(item.stock),
          price: Number(item.price),
          expiry: item.expiry,
          type: item.type,
          updatedAt: new Date(),
        })
      );

      await Promise.all(promises);
      setScannedItems([]);
      alert("Inventory Updated Successfully!");
      navigate("/pharmacy/inventory");
    } catch (error) {
      console.error("Save Error:", error);
      alert("Error saving data");
      setSaving(false);
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onerror = () => reject(new Error("Failed to load image"));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 1024;

          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              const resizedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              console.log(
                `Compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(
                  resizedFile.size /
                  1024 /
                  1024
                ).toFixed(2)}MB`
              );
              resolve(resizedFile);
            },
            "image/jpeg",
            0.6
          );
        };
      };
    });
  };

  const removeItem = (index) => {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <span className="text-2xl">📸</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                AI Stock Scanner
              </h2>
              <p className="text-slate-500 text-sm">
                Snap a photo to auto-detect medicines
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div
          className="glass-card p-8 rounded-2xl text-center mb-8 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
            id="cameraInput"
          />
          <label
            htmlFor="cameraInput"
            className="cursor-pointer flex flex-col items-center gap-3 group"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-4xl">📷</span>
            </div>
            <span className="text-lg font-semibold text-slate-700">
              {loading ? "Analyzing..." : "Tap to Scan Shelf"}
            </span>
            <span className="text-sm text-slate-500">
              Take a photo of medicine packages
            </span>
          </label>

          {loading && (
            <div className="mt-6 flex justify-center">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
          )}

          {previewUrl && !loading && (
            <div className="mt-6">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-48 mx-auto rounded-xl shadow-lg"
              />
            </div>
          )}
        </div>

        {/* Scanned Items */}
        {scannedItems.length > 0 && (
          <div
            className="glass-card p-6 rounded-2xl animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>📋</span> Detected Medicines ({scannedItems.length})
            </h3>

            <div className="space-y-4">
              {scannedItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-white/80 rounded-xl p-4 border border-slate-100 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-slate-800">
                      {item.name}
                    </span>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Dosage
                      </label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) =>
                          handleItemChange(index, "dosage", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Type
                      </label>
                      <select
                        value={item.type}
                        onChange={(e) =>
                          handleItemChange(index, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      >
                        <option>Tablet</option>
                        <option>Syrup</option>
                        <option>Injection</option>
                        <option>Cream</option>
                        <option>Powder</option>
                        <option>Drops</option>
                        <option>Capsule</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Stock
                      </label>
                      <input
                        type="number"
                        value={item.stock}
                        onChange={(e) =>
                          handleItemChange(index, "stock", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(index, "price", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Expiry
                      </label>
                      <input
                        type="month"
                        value={item.expiry}
                        onChange={(e) =>
                          handleItemChange(index, "expiry", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            <button
              onClick={saveToInventory}
              disabled={saving}
              className={`mt-6 w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                saving
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]"
              }`}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>✓ Confirm & Add to Inventory</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
