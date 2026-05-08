import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import FinanceApp from './FinanceApp';
import Auth from './Auth';

function App() {
  const [session, setSession] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
  }, []);

  return (
    <div>
      {(!session || isRecovery) ? (
        <Auth isRecovery={isRecovery} onPasswordUpdated={() => setIsRecovery(false)} />
      ) : (
        <FinanceApp session={session} />
      )}
    </div>
  );
}

export default App;
