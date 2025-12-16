import React from 'react';
import {CustomProvider} from 'rsuite';

export default function ThemeProvider({children}) {
  return <CustomProvider theme="dark">{children}</CustomProvider>;
}
