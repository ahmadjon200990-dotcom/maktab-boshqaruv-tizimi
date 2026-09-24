import {createContext,useContext,useEffect,useState} from 'react'; import {supabase} from '../lib/supabase';
const AuthContext=createContext(null);
export function AuthProvider({children}){const [session,setSession]=useState(null);const [profile,setProfile]=useState(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!supabase){setLoading(false);return}let mounted=true;supabase.auth.getSession().then(async({data})=>{if(!mounted)return;setSession(data.session);if(data.session)await loadProfile(data.session.user.id);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange(async(_,s)=>{setSession(s);if(s)await loadProfile(s.user.id);else setProfile(null);setLoading(false)});return()=>{mounted=false;subscription.unsubscribe()}},[]);
 async function loadProfile(id){const {data}=await supabase.from('profiles').select('*').eq('id',id).single();setProfile(data||null)}
 async function login(email,password){if(!supabase)throw Error('Supabase .env sozlanmagan');const result=await supabase.auth.signInWithPassword({email,password});if(result.error)throw result.error;return result}
 async function logout(){await supabase?.auth.signOut()}
 return <AuthContext.Provider value={{session,profile,loading,login,logout}}>{children}</AuthContext.Provider>}
export const useAuth=()=>useContext(AuthContext);
