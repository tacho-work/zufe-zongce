import { type ReactNode, useState, useEffect, useRef } from 'react';
import './PageTransition.css';

interface PageTransitionProps {
  path: string;
  children: ReactNode;
}

export function PageTransition({ path, children }: PageTransitionProps) {
  const [visible, setVisible] = useState(true);
  const prevPath = useRef(path);

  useEffect(() => {
    if (prevPath.current !== path) {
      setVisible(false);
      const t = setTimeout(() => {
        prevPath.current = path;
        setVisible(true);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [path]);

  return (
    <div className={`page-transition ${visible ? 'page-transition--enter' : 'page-transition--exit'}`}>
      {children}
    </div>
  );
}
