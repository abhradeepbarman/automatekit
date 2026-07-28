import { useEffect } from 'react';

const OAuthCallback = () => {
  useEffect(() => {
    if (!window.opener || window.opener.closed) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) return;

    window.opener.postMessage(
      { type: 'OAUTH_SUCCESS', code },
      window.location.origin,
    );

    window.close();
  }, []);

  return <div>Sucessfull login</div>;
};

export default OAuthCallback;
