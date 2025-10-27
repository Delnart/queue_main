import React, { useEffect, useRef } from 'react';

const TelegramLogin = () => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', 'queue_helper_bot');
      script.setAttribute('data-size', 'large');
      
      // Вказуємо йому викликати глобальну функцію з index.html
      script.setAttribute('data-onauth', 'onTelegramAuth(user)'); 
      
      script.setAttribute('data-request-access', 'write');
      script.async = true;

      ref.current.innerHTML = '';
      ref.current.appendChild(script);
    }
  }, []); 

  return <div ref={ref}></div>;
};

export default TelegramLogin;