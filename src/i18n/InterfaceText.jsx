import React from 'react';
import { useLanguage } from './LanguageContext';
import { translateUI } from './uiText';
export default function InterfaceText({ children }) {
  const { lang } = useLanguage();
  return <>{typeof children === 'string' ? translateUI(children, lang) : children}</>;
}
export function useInterfaceText() {
  const { lang } = useLanguage();
  return (text) => (typeof text === 'string' ? translateUI(text, lang) : text);
}
