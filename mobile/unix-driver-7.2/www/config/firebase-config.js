'use strict';
/* ============================================================
   UniX Driver · Configuración opcional de Firebase Authentication
   ------------------------------------------------------------
   Sin claves, la app usa cuentas LOCALES reales guardadas en el
   dispositivo (registro + ingreso + recuperación por código).
   Con claves, el registro y la recuperación se hacen contra
   Firebase Authentication (correo real de restablecimiento).

   Para activarlo:
   1) Crea un proyecto en https://console.firebase.google.com
   2) Authentication → Sign-in method → habilita Correo/contraseña.
   3) Project settings → tus apps → Web → copia los datos aquí.
   4) Vuelve a compilar el APK (npx cap sync android && assembleRelease).
   La apiKey web de Firebase es pública por diseño; no es un secreto.
   ============================================================ */
window.UNIX_FIREBASE = {
  apiKey: null,          // p. ej. 'AIzaSy...'
  authDomain: null,      // p. ej. 'unix-driver.firebaseapp.com'
  projectId: null        // p. ej. 'unix-driver'
};
