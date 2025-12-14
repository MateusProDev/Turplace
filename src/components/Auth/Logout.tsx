import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebase";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();
  const handle = async () => {
    await signOut(auth);
    navigate('/');
  };
  return (
    <button onClick={handle} className="px-3 py-1 border rounded text-sm">Sair</button>
  );
}
