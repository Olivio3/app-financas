import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import FinanceApp from './FinanceApp';
import Auth from './Auth';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <div>
      {!session ? <Auth /> : <FinanceApp session={session} />}
    </div>
  );
}

export default App;
