import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'user', 'clinic', or 'pharmacy'
  const [loading, setLoading] = useState(true);

  // Function to fetch user data from Firestore
  const fetchUserData = useCallback(async (user) => {
    if (!user) {
      setCurrentUser(null);
      setUserRole(null);
      return;
    }

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        setUserRole(userData.role || null);
        setCurrentUser({ ...user, ...userData });
      } else {
        setCurrentUser(user);
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setCurrentUser(user);
      setUserRole(null);
    }
  }, []);

  // Function to manually refresh user data (call after profile update)
  const refreshUser = useCallback(async () => {
    const user = auth.currentUser;
    if (user) {
      await fetchUserData(user);
    }
  }, [fetchUserData]);

  useEffect(() => {
    // This listener runs whenever the user logs in or out
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserData]);

  return (
    <AuthContext.Provider
      value={{ currentUser, userRole, loading, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook to use this easily in any component
export const useAuth = () => {
  return useContext(AuthContext);
};
