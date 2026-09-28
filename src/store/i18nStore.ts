import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Language = 'es' | 'en';

interface Translations {
  [key: string]: {
    es: string;
    en: string;
  };
}

// Diccionario base de traducciones
const dictionary: Translations = {
  // General
  catalog: { es: 'Catálogo', en: 'Catalog' },
  offers: { es: 'Ofertas', en: 'Offers' },
  contact: { es: 'Contacto', en: 'Contact' },
  profile: { es: 'Mi Perfil', en: 'My Profile' },
  login: { es: 'Iniciar Sesión', en: 'Login' },
  register: { es: 'Regístrate', en: 'Sign Up' },
  logout: { es: 'Cerrar Sesión', en: 'Log Out' },
  email: { es: 'Correo Electrónico', en: 'Email' },
  password: { es: 'Contraseña', en: 'Password' },
  name: { es: 'Nombre', en: 'Name' },
  phone: { es: 'Teléfono', en: 'Phone' },
  forgot_password: { es: '¿Olvidaste tu contraseña?', en: 'Forgot your password?' },
  no_account: { es: '¿No tienes cuenta?', en: "Don't have an account?" },
  have_account: { es: '¿Ya tienes cuenta?', en: 'Already have an account?' },
  my_orders: { es: 'Mis Pedidos', en: 'My Orders' },
  edit_profile: { es: 'Editar Perfil', en: 'Edit Profile' },
  delete_account: { es: 'Eliminar Cuenta', en: 'Delete Account' },
  street: { es: 'Calle / Avenida', en: 'Street / Avenue' },
  number: { es: 'Número / Piso / Puerta', en: 'Number / Apt / Door' },
  postal_code: { es: 'Código Postal', en: 'Postal Code' },
  notes: { es: 'Instrucciones de entrega', en: 'Delivery Instructions' },
  check_email: { es: 'Revisa tu correo', en: 'Check your email' },
  check_email_desc: { es: 'Te hemos enviado un enlace de confirmación.', en: "We've sent you a confirmation link." },
  close: { es: 'Cerrar', en: 'Close' },
  cancel: { es: 'Cancelar', en: 'Cancel' },
  save: { es: 'Guardar', en: 'Save' },
  confirm: { es: 'Confirmar', en: 'Confirm' },

  // Catalog Level
  saturation_mode: { es: '⚠️ MODO SATURACIÓN ACTIVO: Los pedidos tardarán más de 1 hora. Disculpen las molestias.', en: '⚠️ HIGH DEMAND MODE: Orders will take over 1 hour. We apologize for the inconvenience.' },
  full_menu: { es: 'MENÚ COMPLETO', en: 'FULL MENU' },
  order_now: { es: 'PEDIR AHORA', en: 'ORDER NOW' },
  vip_ticker_msg: { es: '🏆 CLUB VIP: gana 4 puntos por cada 10€ y canjea tu ración favorita GRATIS desde 25 puntos', en: '🏆 VIP CLUB: earn 4 points for every €10 and redeem your favorite order FREE from 25 points' },

  // App Level
  splash_title: { es: 'Cargando experiencia...', en: 'Loading experience...' },
  splash_desc: { es: 'Preparando tu menú digital', en: 'Preparing your digital menu' },
  closed_title: { es: 'Cerrado Temporalmente', en: 'Temporarily Closed' },
  closed_desc: { es: 'Lo sentimos mucho, pero en este momento no podemos aceptar nuevos pedidos por un cierre de emergencia o asuntos de fuerza mayor.', en: 'We are very sorry, but we cannot accept new orders at this time due to an emergency closure or force majeure.' },
  closed_btn: { es: 'Entendido, volveré más tarde', en: 'Understood, I will check back later' },
  press_back_again_to_exit: { es: 'Pulsa atrás otra vez para salir', en: 'Press back again to exit' },

  // Dynamic Catalog UI
  our_ingredients_title: { es: 'NUESTROS INGREDIENTES', en: 'OUR INGREDIENTS' },
  our_ingredients_subtitle: { es: 'Carta oficial de toppings disponibles', en: 'Official list of available toppings' },
  ingredients_note: { es: 'Disponibles para personalizar tu ración — pregunta disponibilidad de extras', en: 'Available to customize your order — ask for extras availability' },
  varieties: { es: 'VARIEDADES', en: 'VARIETIES' },

  // Hero
  menu_btn: { es: 'Ver Menú Completo', en: 'View Full Menu' },

  // Cart & Checkout
  cart: { es: 'Carrito', en: 'Cart' },
  order_label: { es: 'Comanda', en: 'Order' },
  process_order: { es: 'Tramitar', en: 'Checkout' },
  empty_cart: { es: 'El carrito está vacío', en: 'Your cart is empty' },
  empty_cart_title: { es: 'Carrito Vacío', en: 'Empty Cart' },
  empty_cart_desc: { es: 'Tu estómago ruge... ¡Es hora de añadir algo delicioso!', en: 'Your stomach is rumbling... Time to add something delicious!' },
  your_order: { es: 'Tu Pedido', en: 'Your Order' },
  clear_cart_confirm: { es: '¿Estás seguro de que quieres vaciar todo tu pedido?', en: 'Are you sure you want to empty your cart?' },
  empty_cart_btn: { es: 'Vaciar carrito', en: 'Empty cart' },
  total: { es: 'Total', en: 'Total' },
  pay: { es: 'Pagar', en: 'Checkout' },
  delivery: { es: 'A domicilio', en: 'Delivery' },
  pickup: { es: 'Recogida en local', en: 'Pickup' },
  local: { es: 'Local / Mesa', en: 'Dine-in' },
  add_to_cart: { es: 'Añadir al carrito', en: 'Add to cart' },
  checkout_title: { es: 'Finalizar Pedido', en: 'Complete Order' },
  order_notes: { es: 'Notas del pedido', en: 'Order notes' },
  payment_method: { es: 'Método de Pago', en: 'Payment Method' },
  cash: { es: 'Efectivo', en: 'Cash' },
  card: { es: 'Tarjeta', en: 'Card' },

  // Admin & TPV
  admin_panel: { es: 'Panel de Administración', en: 'Admin Panel' },
  dashboard: { es: 'Resumen', en: 'Dashboard' },
  orders: { es: 'Pedidos', en: 'Orders' },
  kiosk: { es: 'TPV Mostrador', en: 'POS Counter' },
  analytics: { es: 'Analítica', en: 'Analytics' },
  settings: { es: 'Ajustes', en: 'Settings' },
  new_order: { es: 'Nuevo Pedido', en: 'New Order' },
  assign_client: { es: 'Asignar Cliente', en: 'Assign Client' },
  search_client: { es: 'Buscar cliente...', en: 'Search client...' },
  create_client: { es: 'Crear Cliente Nuevo', en: 'Create New Client' },

  // Filters
  all: { es: 'Todo', en: 'All' },
  drinks: { es: 'Bebidas', en: 'Drinks' },
  desserts: { es: 'Postres', en: 'Desserts' },

  // Modals & Components
  available_options: { es: 'Opciones disponibles', en: 'Available options' },
  quantity: { es: 'Cantidad', en: 'Quantity' },
  notes_for_kitchen: { es: 'Notas para cocina', en: 'Notes for kitchen' },
  optional: { es: '(opcional)', en: '(optional)' },
  notes_placeholder: { es: 'Ej: Extra fría, sin hielo...', en: 'Ex: Extra cold, no ice...' },
  choose_options: { es: 'Elige tus opciones', en: 'Choose your options' },
  special_oven_recommendation: { es: '★ Recomendación Especial de la Casa', en: '★ Special House Recommendation' },
  complete_your_order: { es: '¿COMPLETAS TU COMANDA?', en: 'COMPLETE YOUR ORDER?' },
  upsell_subtitle: { es: 'Complementos y bebidas Gourmet elaborados al momento', en: 'Gourmet sides and drinks made to order' },
  no_suggestions: { es: 'No hay sugerencias configuradas en este momento.', en: 'No suggestions configured at this time.' },
  add_item: { es: '+ Añadir', en: '+ Add' },
  added: { es: 'Añadido ✓', en: 'Added ✓' },
  keep_browsing: { es: '🍟 + Seguir en Menú', en: '🍟 + Keep Browsing' },
  view_recommendations: { es: '★ Ver Recomendaciones', en: '★ View Recommendations' },
  payment_gateway: { es: '💳 Pasarela de Pago (→)', en: '💳 Checkout (→)' },
  choose_sauce: { es: 'Elige tu salsa', en: 'Choose your sauce' },
  additional_notes: { es: 'Notas adicionales', en: 'Additional notes' },
  sauce_notes_placeholder: { es: 'Ej: Poca salsa, bien tostado...', en: 'Eg: Light sauce, well toasted...' },
  sauce_label: { es: 'Salsa', en: 'Sauce' },
  notes_label: { es: 'Notas', en: 'Notes' },
  add_btn: { es: 'AÑADIR', en: 'ADD' },
  select_base: { es: 'Seleccionar Base', en: 'Select Base' },
  base_normal: { es: 'Normal', en: 'Normal' },
  base_blanca: { es: 'Blanca', en: 'White' },
  base_maxxi: { es: 'Maxxi (+3€)', en: 'Maxxi (+3€)' },
  special_notes: { es: 'Notas Especiales', en: 'Special Notes' },
  special_notes_placeholder: { es: 'Ej. Salsa aparte, sin sal...', en: 'Ex. Sauce on the side, no salt...' },
  pizza_notes_placeholder: { es: 'Ej. Salsa aparte, sin sal...', en: 'Ex. Sauce on the side, no salt...' },

  // Checkout
  far_away_title: { es: '¡Estás un poco lejos!', en: "You're a bit far!" },
  call_now: { es: 'Llamar Ahora', en: 'Call Now' },
  understood: { es: 'Entendido', en: 'Understood' },
  official_checkout: { es: 'Pasarela Oficial de Pedidos', en: 'Official Checkout' },
  checkout_summary: { es: 'Resumen y Tramitación', en: 'Summary and Checkout' },
  items_in_order: { es: 'Artículos en tu Comanda', en: 'Items in your Order' },
  items_count: { es: 'Artículos', en: 'Items' },
  size_maxi: { es: 'Tamaño: RACIÓN GRANDE', en: 'Size: LARGE PORTION' },
  size_normal: { es: 'Tamaño: Normal', en: 'Size: Normal' },
  vip_club: { es: 'Club VIP:', en: 'VIP Club:' },
  redeem_25: { es: 'Canjear 25 ptos para obtener un descuento de', en: 'Redeem 25 pts to get a discount of' },
  choose_redeem_item: { es: 'Elige a qué producto aplicar tu descuento:', en: 'Choose which product to apply your discount to:' },
  add_product_redeem: { es: 'Añade un producto a tu pedido para canjear tus puntos.', en: 'Add a product to your order to redeem points.' },
  add_pizza_redeem: { es: 'Añade un producto a tu pedido para canjear tus puntos.', en: 'Add a product to your order to redeem points.' },
  earn_points: { es: 'Sumarás', en: 'You will earn' },
  with_this_order: { es: 'pts con este pedido', en: 'pts with this order' },
  redeem_btn: { es: 'Canjear 25 ptos', en: 'Redeem 25 pts' },
  redeemed_btn: { es: 'Puntos Canjeados ✓', en: 'Points Redeemed ✓' },
  have_vip: { es: '¿Tienes cuenta VIP?', en: 'Have a VIP account?' },
  login_to_redeem: { es: 'Inicia sesión para canjear o sumar puntos.', en: 'Log in to redeem or earn points.' },
  delivery_mode: { es: '1. Modalidad de Entrega o Recogida', en: '1. Delivery or Pickup Method' },
  delivery_zone_msg: { es: 'Envío a Domicilio en tu Zona', en: 'Home Delivery in your Area' },
  free_delivery: { es: 'Reparto Gratuito', en: 'Free Delivery' },
  pickup_store: { es: 'Recoger en el Local', en: 'Pickup at the Store' },
  contact_data: { es: '2. Datos de Contacto y Entrega', en: '2. Contact and Delivery Data' },
  full_name: { es: 'Nombre Completo', en: 'Full Name' },
  name_placeholder: { es: 'Ej. Carlos Mendoza', en: 'Ex. Carlos Mendoza' },
  mobile_whatsapp: { es: 'Móvil WhatsApp', en: 'Mobile WhatsApp' },
  exact_street: { es: 'Calle Exacta', en: 'Exact Street' },
  street_placeholder: { es: 'Ej. Calle Amapola', en: 'Ex. Maple Street' },
  notes_optional: { es: 'Notas (Opcional)', en: 'Notes (Optional)' },
  notes_placeholder_checkout: { es: 'Piso, puerta...', en: 'Apt, door...' },
  notes_or_table: { es: 'Notas o Mesa (Opcional)', en: 'Notes or Table (Optional)' },
  notes_table_placeholder: { es: 'Ej. Mesa 3 o Llegaré en 15 mins', en: 'Ex. Table 3 or Arriving in 15 mins' },
  when_want: { es: '3. Cuándo lo quieres', en: '3. When do you want it' },
  asap: { es: 'Lo antes posible', en: 'As soon as possible' },
  prepare_now: { es: 'Prepárenlo ya', en: 'Prepare it now' },
  closed_now: { es: 'Local Cerrado Ahora', en: 'Store Closed Now' },
  schedule: { es: 'Programar', en: 'Schedule' },
  choose_time: { es: 'Elegir hora', en: 'Choose time' },
  no_slots_today: { es: 'Sin turnos hoy', en: 'No slots today' },
  closed_no_slots: { es: 'El local está cerrado y no hay más turnos por hoy.', en: 'The store is closed and there are no more slots today.' },
  payment_form: { es: '4. Forma de Pago', en: '4. Payment Method' },
  pay_cash: { es: 'Efectivo', en: 'Cash' },
  pay_cash_delivery_desc: { es: 'Pagas en efectivo al repartidor', en: 'Pay in cash to the courier' },
  pay_cash_pickup_desc: { es: 'Pagas en efectivo al recoger en el local', en: 'Pay in cash when you pick up' },
  pay_card_terminal: { es: 'Tarjeta / Datáfono (SumUp)', en: 'Card / Terminal (SumUp)' },
  pay_card_terminal_delivery_desc: { es: 'El repartidor lleva datáfono SumUp (tarjeta o contactless)', en: 'The courier carries a SumUp terminal (card or contactless mobile)' },
  pay_card_terminal_pickup_desc: { es: 'Pagas con tarjeta o contactless en el local al recoger (Datáfono SumUp)', en: 'Pay by card or contactless at the store when you pick up (SumUp terminal)' },
  instant_confirm: { es: '🔒 Tu pedido queda confirmado al instante.', en: '🔒 Your order is confirmed instantly.' },
  min_order_delivery: { es: 'El pedido mínimo para envíos a domicilio gratuitos es de', en: 'The minimum order for free delivery is' },
  accept_surcharge: { es: 'Aceptar recargo de 1.50 € por pedido pequeño', en: 'Accept 1.50 € surcharge for small order' },
  total_to_pay: { es: 'Total a Abonar', en: 'Total to Pay' },
  confirm_order_btn: { es: 'Confirmar Pedido →', en: 'Confirm Order →' },
  processing: { es: 'Procesando...', en: 'Processing...' },
  confirming_order: { es: 'Confirmando Pedido...', en: 'Confirming Order...' },

  // UserModal & Profile
  vip_account: { es: 'Mi Cuenta VIP', en: 'My VIP Account' },
  brand_name: { es: 'D-Kitchen Gourmet', en: 'D-Kitchen Gourmet' },
  vip_account_desc_logged_in: { es: 'Club de Fidelización y Pedidos', en: 'Loyalty & Ordering Club' },
  vip_account_desc_logged_out: { es: 'Inicia sesión para acumular puntos', en: 'Log in to earn points' },
  admin_session_title: { es: 'Sesión Administrativa', en: 'Admin Session' },
  admin_session_desc: { es: 'Estás usando una cuenta con privilegios de administrador. Los pedidos personales y los puntos de fidelidad están deshabilitados para no cruzar datos del TPV. Por favor, utiliza otra cuenta para pedidos personales.', en: 'You are using an admin account. Personal orders and loyalty points are disabled to avoid mixing POS data. Please use another account for personal orders.' },
  admin_logout: { es: 'Cerrar Sesión Admin', en: 'Log Out Admin' },
  continue_with_google: { es: 'Continuar con Google', en: 'Continue with Google' },
  or_with_email: { es: 'O con tu email', en: 'Or with your email' },
  email_or_phone: { es: 'Email / Teléfono', en: 'Email / Phone' },
  remember_me: { es: 'Recordarme', en: 'Remember me' },
  forgot_password_question: { es: '¿Olvidaste tu contraseña?', en: 'Forgot your password?' },
  login_btn: { es: 'Entrar', en: 'Login' },
  dont_have_account: { es: '¿No tienes cuenta?', en: "Don't have an account?" },
  register_here: { es: 'Regístrate', en: 'Sign Up' },
  reset_password_desc: { es: 'Ingresa tu email y te enviaremos instrucciones para restablecer tu contraseña.', en: 'Enter your email and we will send you instructions to reset your password.' },
  send_instructions: { es: 'Enviar Instrucciones', en: 'Send Instructions' },
  go_back: { es: 'Volver', en: 'Go Back' },
  phone_number: { es: 'Teléfono', en: 'Phone' },
  email_address: { es: 'Email', en: 'Email' },
  create_account_btn: { es: 'Crear Cuenta', en: 'Create Account' },
  already_have_account: { es: '¿Ya tienes cuenta?', en: 'Already have an account?' },
  login_here: { es: 'Entra aquí', en: 'Log in here' },
  hello: { es: '¡Hola,', en: 'Hello,' },
  user: { es: 'Usuario', en: 'User' },
  vip_welcome: { es: 'Bienvenido al Club de Fidelización VIP', en: 'Welcome to the VIP Loyalty Club' },
  accumulated_points: { es: 'Puntos Acumulados', en: 'Accumulated Points' },
  my_data: { es: 'Mis Datos', en: 'My Data' },
  edit_btn: { es: 'Editar', en: 'Edit' },
  address_label: { es: 'Dirección:', en: 'Address:' },
  phone_label: { es: 'Teléfono:', en: 'Phone:' },
  order_history: { es: 'Historial de Pedidos', en: 'Order History' },
  available_rewards: { es: 'Recompensas Disponibles', en: 'Available Rewards' },
  free_portion: { es: 'Ración Gourmet Gratis', en: 'Free Gourmet Portion' },
  free_pizza_burger: { es: 'Ración Gourmet Gratis', en: 'Free Gourmet Portion' },
  unlocked: { es: 'Desbloqueado', en: 'Unlocked' },
  locked: { es: 'Bloqueado', en: 'Locked' },
  how_it_works_title: { es: '💡 ¿Cómo funciona?', en: '💡 How does it work?' },
  how_it_works_desc: { es: 'Acumulas puntos automáticamente con cada pedido confirmado. Obtienes 4 puntos por cada 10€ gastados. Con 25 puntos puedes canjear una ración gratis.', en: 'You automatically earn points with every confirmed order. You get 4 points for every 10€ spent. With 25 points you can redeem a free order.' },
  logout_btn: { es: 'Cerrar Sesión', en: 'Log Out' },
  no_orders_yet: { es: 'Aún no hay pedidos', en: 'No orders yet' },
  no_orders_desc: { es: 'Tu estómago ruge... ¡Es hora de hacer tu primer pedido!', en: 'Your stomach is rumbling... It\'s time to place your first order!' },
  view_menu: { es: 'Ver Menú', en: 'View Menu' },
  product: { es: 'Producto', en: 'Product' },
  repeat_order: { es: 'Repetir Pedido', en: 'Repeat Order' },
  complete_delivery_data: { es: 'Completar Datos de Entrega', en: 'Complete Delivery Data' },
  delivery_data_desc: { es: 'Para poder enviar tus pedidos a domicilio o contactarte si surge un imprevisto, necesitamos conocer tu teléfono y dirección.', en: 'In order to send your home deliveries or contact you in case of an unforeseen event, we need to know your phone and address.' },
  street_label: { es: 'Calle', en: 'Street' },
  number_label: { es: 'Número', en: 'Number' },
  cp_label: { es: 'CP', en: 'ZIP' },
  details_notes_optional: { es: 'Detalles o Notas (Opcional)', en: 'Details or Notes (Optional)' },
  saving: { es: 'Guardando...', en: 'Saving...' },
  save_info_btn: { es: 'Guardar Información', en: 'Save Information' },
  cancel_btn: { es: 'Cancelar', en: 'Cancel' },
  legal_center: { es: 'Centro Legal', en: 'Legal Center' },
  legal_center_desc: { es: 'Transparencia y normativas RGPD', en: 'Transparency and GDPR regulations' },
  privacy_policy: { es: 'Política de Privacidad', en: 'Privacy Policy' },
  terms_and_conditions: { es: 'Términos y Condiciones', en: 'Terms and Conditions' },
  data_usage: { es: 'Uso y Tratamiento de Datos', en: 'Data Usage and Processing' },
  request_account_deletion: { es: 'Solicitar Eliminación de Cuenta', en: 'Request Account Deletion' },
  understood_accept: { es: 'Entendido y Aceptar', en: 'Understood and Accept' },
  delete_account_title: { es: 'Baja de Usuario', en: 'Delete Account' },
  delete_account_desc: { es: 'Lamentamos que quieras irte. Ayúdanos a mejorar.', en: 'We are sorry to see you go. Help us improve.' },
  why_delete_account: { es: '¿Por qué deseas eliminar tu cuenta?', en: 'Why do you want to delete your account?' },
  select_reason: { es: 'Selecciona un motivo...', en: 'Select a reason...' },
  reason_not_using: { es: 'No uso la aplicación', en: 'I do not use the app' },
  reason_too_many_notifications: { es: 'Recibo demasiadas notificaciones', en: 'I receive too many notifications' },
  reason_problems_orders: { es: 'Problemas con mis pedidos', en: 'Problems with my orders' },
  reason_moving: { es: 'Me mudo a otra ciudad', en: 'I am moving to another city' },
  reason_other: { es: 'Otro motivo', en: 'Other reason' },
  explain_reason: { es: 'Explícanos tu motivo...', en: 'Explain your reason...' },
  understand_deletion_irreversible: { es: 'Entiendo que esta acción es irreversible y todos mis puntos y datos personales serán borrados permanentemente.', en: 'I understand that this action is irreversible and all my points and personal data will be permanently deleted.' },
  confirm_permanent_deletion: { es: 'Confirmar Eliminación Definitiva', en: 'Confirm Permanent Deletion' },
  see_you_soon: { es: '¡Hasta Pronto!', en: 'See You Soon!' },
  account_deleted_msg: { es: 'Tu cuenta y todos tus datos han sido eliminados de forma segura de nuestros sistemas. Esperamos volver a verte pronto.', en: 'Your account and all your data have been securely deleted from our systems. We hope to see you again soon.' },
  close_window: { es: 'Cerrar Ventana', en: 'Close Window' },
  legal_footer: { es: 'Páginas Legales y Privacidad', en: 'Legal Pages and Privacy' },

  // UserModal Errors & Legal
  please_enter_email_reset: { es: 'Por favor ingresa tu email para recuperar la contraseña.', en: 'Please enter your email to recover your password.' },
  email_sent_instructions: { es: 'Te hemos enviado un correo con las instrucciones.', en: 'We have sent you an email with the instructions.' },
  cannot_delete_account: { es: 'No se pudo eliminar la cuenta. ', en: 'Could not delete account. ' },
  error_updating_profile: { es: 'Error al actualizar perfil', en: 'Error updating profile' },
  last_updated_july_2026: { es: 'Última actualización: septiembre de 2026', en: 'Last update: September 2026' },

  // POLÍTICA DE PRIVACIDAD
  legal_privacy_p1: { es: 'Responsable del tratamiento: {business_name}, negocio de hostelería con operativa en España (ubicación virtual). Puede contactar con nosotros sobre el tratamiento de sus datos personales a través de los canales de contacto disponibles en la aplicación. {fiscal_disclosure}', en: 'Data controller: {business_name}, a hospitality business operating in Spain (virtual location). You can contact us regarding the processing of your personal data through the contact channels available in the app. {fiscal_disclosure}' },
  legal_privacy_p2: { es: 'Datos que recogemos y su finalidad: nombre, teléfono, dirección de entrega y, si se registra en la aplicación, correo electrónico. Estos datos se usan exclusivamente para gestionar y entregar sus pedidos, gestionar el programa de puntos VIP, y comunicarle el estado de sus pedidos. No se utilizan con ningún otro fin.', en: 'Data we collect and why: name, phone number, delivery address, and, if you register in the app, email address. This data is used exclusively to manage and deliver your orders, manage the VIP points program, and inform you about your order status. It is not used for any other purpose.' },
  legal_privacy_p3: { es: 'Base legal: la ejecución del contrato que se formaliza al realizar un pedido, y su consentimiento expreso al registrarse en la aplicación.', en: 'Legal basis: performance of the contract formed when you place an order, and your explicit consent when you register in the app.' },
  legal_privacy_p4: { es: 'Conservación: sus datos se conservan mientras mantenga una cuenta activa, y posteriormente durante los plazos legalmente exigidos para el cumplimiento de obligaciones fiscales y contables.', en: 'Retention: your data is kept for as long as your account remains active, and afterwards for the periods legally required for tax and accounting purposes.' },
  legal_privacy_p5: { es: 'Sus derechos: puede ejercer en cualquier momento sus derechos de acceso, rectificación, supresión, oposición y portabilidad. Puede eliminar su cuenta y todos sus datos asociados directamente desde "Solicitar Eliminación de Cuenta" en esta misma sección. Si considera que sus derechos no han sido atendidos correctamente, puede reclamar ante la Agencia Española de Protección de Datos (aepd.es).', en: 'Your rights: you may exercise your rights of access, rectification, erasure, objection and portability at any time. You can delete your account and all associated data directly from "Request Account Deletion" in this same section. If you believe your rights have not been properly addressed, you may file a complaint with the Spanish Data Protection Agency (aepd.es).' },
  legal_privacy_p6: { es: 'Terceros: utilizamos proveedores tecnológicos (alojamiento web y base de datos) que actúan como encargados del tratamiento bajo contrato y cumplen el RGPD. No vendemos ni cedemos sus datos a terceros con fines comerciales o publicitarios.', en: 'Third parties: we use technology providers (web hosting and database) that act as data processors under contract and comply with GDPR. We do not sell or share your data with third parties for commercial or advertising purposes.' },

  // TÉRMINOS Y CONDICIONES
  legal_terms_p1: { es: 'El presente documento regula el uso de la aplicación y web de pedidos de {business_name}, negocio de hostelería con operativa en España (ubicación virtual). El uso de nuestros servicios implica la aceptación de estas condiciones. {fiscal_disclosure}', en: 'This document governs the use of the {business_name} ordering app and website, a hospitality business operating in Spain (virtual location). Using our services implies acceptance of these terms. {fiscal_disclosure}' },
  legal_terms_p2: { es: 'Pedidos y disponibilidad: los precios, la disponibilidad de productos y los horarios de apertura se muestran en tiempo real en la aplicación y pueden variar. Nos reservamos el derecho a rechazar o cancelar un pedido en caso de error de precio, falta de stock, o imposibilidad de servirlo dentro de nuestra zona de reparto.', en: 'Orders and availability: prices, product availability and opening hours are shown in real time in the app and may change. We reserve the right to refuse or cancel an order in case of a pricing error, lack of stock, or inability to deliver within our delivery area.' },
  legal_terms_p3: { es: 'Zona de reparto: el servicio de entrega a domicilio está limitado geográficamente a la zona de reparto configurada por el negocio. La aplicación verifica automáticamente que la dirección de entrega esté dentro de esta zona antes de confirmar el pedido.', en: 'Delivery area: home delivery is geographically limited to the delivery zone configured by the business. The app automatically verifies that the delivery address is within this area before confirming the order.' },
  legal_terms_p4: { es: 'Pago: aceptamos pago en efectivo o con datáfono físico en el momento de la entrega/recogida. En ningún caso almacenamos los datos completos de su tarjeta.', en: 'Payment: we accept cash or physical card terminal at delivery/pickup. We never store your full card details.' },
  legal_terms_p5: { es: 'Programa de puntos VIP: los puntos se acumulan según el importe de sus pedidos y pueden canjearse por descuentos según las condiciones vigentes en cada momento en la aplicación. Nos reservamos el derecho a modificar el programa de fidelización.', en: 'VIP points program: points accrue based on your order amounts and can be redeemed for discounts under the terms in effect in the app at any given time. We reserve the right to modify the loyalty program.' },
  legal_terms_p6: { es: 'Estas condiciones se rigen por la legislación española. Cualquier controversia se someterá a los juzgados y tribunales competentes conforme a la normativa de protección de consumidores y usuarios.', en: 'These terms are governed by Spanish law. Any dispute will be submitted to the competent courts in accordance with consumer protection regulations.' },

  // USO Y TRATAMIENTO DE DATOS
  legal_data_p1: { es: 'Esta aplicación es una Progressive Web App (PWA) que puede instalarse en su dispositivo. Al instalarla no se accede a ningún dato de su dispositivo distinto de los que usted proporciona voluntariamente (nombre, teléfono, dirección).', en: 'This app is a Progressive Web App (PWA) that can be installed on your device. Installing it does not grant access to any device data other than what you voluntarily provide (name, phone, address).' },
  legal_data_p2: { es: 'Almacenamiento técnico: usamos almacenamiento local del navegador (localStorage/sessionStorage) para recordar su carrito de compra y su sesión mientras usa la aplicación. Es información estrictamente técnica y necesaria para el funcionamiento del servicio; no se comparte con terceros y se elimina al cerrar sesión o vaciar los datos del navegador.', en: 'Technical storage: we use browser local storage (localStorage/sessionStorage) to remember your shopping cart and session while using the app. This is strictly technical information necessary for the service to work; it is not shared with third parties and is cleared when you log out or clear your browser data.' },
  legal_data_p3: { es: 'Notificaciones: si usted las activa, las utilizamos exclusivamente para avisarle de cambios en el estado de sus propios pedidos. Puede desactivarlas en cualquier momento desde la configuración de su navegador o dispositivo.', en: 'Notifications: if you enable them, we use them exclusively to notify you about changes to the status of your own orders. You can disable them at any time from your browser or device settings.' },
  legal_data_p4: { es: 'Proveedores tecnológicos: sus datos se almacenan en infraestructura de Neon (base de datos PostgreSQL) y Vercel (alojamiento web), proveedores que cumplen garantías adecuadas de protección de datos conforme al RGPD.', en: 'Technology providers: your data is stored on Neon (PostgreSQL database) and Vercel (web hosting) infrastructure, providers that meet appropriate data protection safeguards under GDPR.' },
  legal_data_p5: { es: 'Analítica interna: registramos de forma anónima el número de visitas a la web y qué categorías del menú se consultan, sin asociarlo a ninguna persona identificable, únicamente para mejorar nuestro catálogo y servicio.', en: 'Internal analytics: we anonymously record the number of website visits and which menu categories are viewed, without linking this to any identifiable person, solely to improve our catalog and service.' },

  // Order Tracking
  in_progress: { es: 'En Curso', en: 'In Progress' },
  history: { es: 'Historial', en: 'History' },
  no_active_orders: { es: 'No hay pedidos en curso', en: 'No active orders' },
  hungry_check_menu: { es: '¿Tienes hambre? Revisa nuestro menú y pide algo delicioso.', en: 'Hungry? Check our menu and order something delicious.' },
  explore_menu: { es: 'Ver el Menú', en: 'View Menu' },
  order_num: { es: 'Pedido', en: 'Order' },
  select_beverages: { es: 'SELECCIONA TUS BEBIDAS', en: 'SELECT YOUR DRINKS' },
  ready: { es: 'LISTO', en: 'READY' },
  active_tracking: { es: 'Tracking Activo', en: 'Active Tracking' },
  delivery_method_home: { es: 'A Domicilio', en: 'Delivery' },
  delivery_method_pickup: { es: 'Recogida Local', en: 'Pickup' },
  status_received: { es: 'Recibido', en: 'Received' },
  status_cooking: { es: 'Cocinando', en: 'Cooking' },
  status_ready: { es: 'Listo', en: 'Ready' },
  tracking_msg_pending: { es: 'Estamos confirmando tu pedido y pronto empezaremos a prepararlo.', en: 'We are confirming your order and will start preparing it soon.' },
  tracking_msg_cooking: { es: 'Tu pedido está en cocina preparándose con mucho mimo.', en: 'Your order is in the kitchen being prepared with care.' },
  tracking_msg_delivering: { es: '¡El repartidor va de camino a tu casa!', en: 'The delivery driver is on the way to your house!' },
  tracking_msg_ready: { es: '¡Tu pedido está listo! Ya puedes pasar a recogerlo.', en: 'Your order is ready! You can now come pick it up.' },
  order_summary: { es: 'Resumen del Pedido', en: 'Order Summary' },
  no_completed_orders: { es: 'Aún no tienes pedidos completados.', en: 'You have no completed orders yet.' },

  // UserModal Placeholders
  placeholder_name_example: { es: 'Tu nombre', en: 'Your name' },
  placeholder_phone_example: { es: 'Ej: 600 000 000', en: 'E.g., 600 000 000' },
  placeholder_street_example: { es: 'Ej: Calle Principal', en: 'E.g., Main Street' },
  placeholder_number_example: { es: 'Ej: 1', en: 'E.g., 1' },
  placeholder_cp_example: { es: '28013', en: '28013' },
  placeholder_notes_example: { es: 'Piso, puerta, etc.', en: 'Apt, door, etc.' },

  // Header & App
  install_app: { es: 'Instalar App', en: 'Install App' },
  switch_lang_en: { es: 'Switch to English', en: 'Switch to English' },
  switch_lang_es: { es: 'Cambiar a Español', en: 'Cambiar a Español' },
  
  // Hero
  vip_slide_badge: { es: '🎁 CLUB VIP', en: '🎁 VIP CLUB' },
  vip_slide_title: { es: 'GANA PUNTOS EN CADA PEDIDO:', en: 'EARN POINTS ON EVERY ORDER:' },
  vip_slide_subtitle: { es: '¡Y CANJEA TU PREMIO GRATIS!', en: 'AND REDEEM YOUR FREE REWARD!' },
  vip_slide_desc: { es: 'Regístrate gratis, acumula puntos en tus pedidos y canjea platos exclusivos gratis.', en: 'Register for free, earn points on your orders and redeem exclusive items for free.' },

  // IngredientsModal
  custom_taste: { es: 'A TU GUSTO', en: 'CUSTOM TASTE' },
  config_ingredients: { es: 'Personaliza tu plato con tus opciones favoritas', en: 'Customize your dish with your favorite options' },
  config_pizza_ingredients: { es: 'Personaliza tu plato con tus opciones favoritas', en: 'Customize your dish with your favorite options' },
  base_label: { es: '(BASE)', en: '(BASE)' },
  add_extra_ingredients: { es: 'Añade Extras', en: 'Add Extras' },
  new_product: { es: 'Nuevo Producto', en: 'New Product' },
  new_pizza: { es: 'Nuevo Producto', en: 'New Product' },
  from: { es: 'Desde', en: 'From' },
  view_options: { es: 'Ver Opciones', en: 'View Options' },
  total_product: { es: 'Total', en: 'Total' },
  total_pizza: { es: 'Total', en: 'Total' },
  add_to_order: { es: 'AÑADIR AL PEDIDO', en: 'ADD TO ORDER' },

  // Notifications
  status_pending_title: { es: 'PEDIDO RECIBIDO', en: 'ORDER RECEIVED' },
  status_pending_desc: { es: 'Estamos confirmando tu pedido.', en: 'We are confirming your order.' },
  status_cooking_title: { es: 'COCINANDO', en: 'COOKING' },
  status_cooking_desc: { es: 'Tu pedido se está preparando en cocina.', en: 'Your order is being prepared in the kitchen.' },
  status_delivering_title: { es: 'EN REPARTO', en: 'OUT FOR DELIVERY' },
  status_delivering_desc: { es: 'El repartidor va en camino.', en: 'The delivery driver is on the way.' },
  status_ready_title: { es: 'LISTO PARA RECOGER', en: 'READY FOR PICKUP' },
  status_ready_desc: { es: 'Tu pedido está listo en el local.', en: 'Your order is ready at the store.' },
  status_cancelled_title: { es: 'PEDIDO RECHAZADO', en: 'ORDER REJECTED' },
  status_cancelled_desc: { es: 'Lamentablemente tu pedido ha sido cancelado o rechazado.', en: 'Unfortunately your order has been cancelled or rejected.' },
  status_completed_title: { es: 'COMPLETADO', en: 'COMPLETED' },
  status_completed_desc: { es: 'Pedido entregado.', en: 'Order delivered.' },
  order_delivered_title: { es: '¡Pedido Entregado!', en: 'Order Delivered!' },
  order_delivered_desc: { es: 'Esperamos que lo disfrutes muchísimo. Gracias por tu confianza.', en: 'We hope you enjoy it very much. Thank you for your trust.' },
  order_update_title: { es: 'Actualización de Pedido', en: 'Order Update' },

  // Reviews
  thanks_for_review: { es: '¡Gracias por tu reseña!', en: 'Thanks for your review!' },
  review_help_improve: { es: 'Tus comentarios nos ayudan a mejorar cada día.', en: 'Your feedback helps us improve every day.' },
  hope_enjoy_food: { es: 'Esperamos que disfrutes muchísimo de tu comida.', en: 'We hope you enjoy your food very much.' },
  could_have_earned: { es: '¡Podrías haber ganado ', en: 'You could have earned ' },
  you_earned: { es: 'Has ganado ', en: 'You earned ' },
  points_abbr: { es: ' ptos', en: ' pts' },
  dont_lose_points_next_order: { es: 'No pierdas tus puntos en tu próximo pedido.', en: "Don't lose your points on your next order." },
  create_free_account: { es: 'Crear mi cuenta gratis', en: 'Create my free account' },
  what_did_you_think: { es: '¿Qué te ha parecido?', en: 'What did you think?' },
  submit_rating: { es: 'Enviar Valoración', en: 'Submit Rating' },
  review_comment_placeholder: { es: 'Cuéntanos más (opcional)...', en: 'Tell us more (optional)...' },

  // Guest Registration
  error_creating_account: { es: 'Error al crear la cuenta.', en: 'Error creating account.' },
  order_confirmed_title: { es: '¡Pedido Confirmado!', en: 'Order Confirmed!' },
  order_in_kitchen: { es: 'Tu pedido ya está en cocina.', en: 'Your order is already in the kitchen.' },
  dont_lose_points: { es: '¡No pierdas tus puntos!', en: "Don't lose your points!" },
  create_account_fast_1: { es: 'Crea una cuenta rápido y llévate', en: 'Create an account quickly and get' },
  vip_points_label: { es: 'Puntos VIP', en: 'VIP Points' },
  create_account_fast_2: { es: 'por este pedido.', en: 'for this order.' },
  min_6_chars: { es: 'Mínimo 6 caracteres', en: 'Minimum 6 characters' },
  yes_register_win_points: { es: 'Sí, Registrarme y Ganar Puntos', en: 'Yes, Register and Earn Points' },
  no_points_track_order: { es: 'No quiero puntos, seguir al Tracking', en: 'No points, continue to Tracking' },
  
  // --- TICKETS ---
  ticket_delivery: { es: '¡A DOMICILIO!', en: 'DELIVERY!' },
  ticket_pickup: { es: 'RECOGIDA LOCAL', en: 'LOCAL PICKUP' },
  ticket_client: { es: 'Cliente:', en: 'Client:' },
  no_name: { es: 'Sin Nombre', en: 'No Name' },
  ticket_phone: { es: 'Tel:', en: 'Tel:' },
  ticket_qty: { es: 'CANT', en: 'QTY' },
  ticket_item: { es: 'ARTÍCULO', en: 'ITEM' },
  ticket_euros: { es: 'EUROS', en: 'EUROS' },
  ticket_subtotal: { es: 'SUBTOTAL:', en: 'SUBTOTAL:' },
  ticket_vip_discount: { es: 'DESC. CLUB VIP:', en: 'VIP CLUB DISC.:' },
  ticket_total: { es: 'TOTAL:', en: 'TOTAL:' },
  ticket_order_id: { es: 'ID Pedido: #', en: 'Order ID: #' },
  ticket_thanks: { es: '¡Gracias por elegirnos!', en: 'Thank you for choosing us!' },
  ticket_end: { es: '- FIN DEL TICKET -', en: '- END OF TICKET -' },

  // --- ADMIN PAGES ---
  unknown_product: { es: 'Producto Desconocido', en: 'Unknown Product' },
  no_phone: { es: 'Sin teléfono', en: 'No phone' },
  no_email: { es: 'Sin email', en: 'No email' },
  status_ready_pickup_title: { es: 'Listo para recoger', en: 'Ready for pickup' },
  client_id: { es: 'ID Cliente', en: 'Client ID' },
  points: { es: 'Puntos', en: 'Points' },
  registration_date: { es: 'Fecha de Registro', en: 'Registration Date' },
  error_loading_catalog: { es: 'Error al cargar el catálogo', en: 'Error loading catalog' },
  error_delete_category_with_products: { es: 'No puedes eliminar una categoría que tiene productos. Mueve o borra sus productos primero.', en: 'You cannot delete a category that has products. Move or delete its products first.' },
  confirm_delete_category: { es: '¿Estás seguro de eliminar esta categoría?', en: 'Are you sure you want to delete this category?' },
  confirm_delete_category_title: { es: 'Eliminar categoría', en: 'Delete category' },
  confirm_delete_product_title: { es: 'Eliminar producto', en: 'Delete product' },
  error_deleting_category: { es: 'Error al eliminar categoría', en: 'Error deleting category' },
  category_deleted_success: { es: 'Categoría eliminada', en: 'Category deleted' },
  edit_category: { es: 'Editar categoría', en: 'Edit category' },
  delete_category: { es: 'Eliminar categoría', en: 'Delete category' },
  has_photo: { es: 'Tiene foto', en: 'Has photo' },
  hide_product: { es: 'Ocultar producto', en: 'Hide product' },
  show_product: { es: 'Mostrar producto', en: 'Show product' },
  category_saved_success: { es: 'Categoría guardada con éxito', en: 'Category saved successfully' },
  product_saved_success: { es: 'Producto guardado con éxito', en: 'Product saved successfully' },
  order_id: { es: 'ID Pedido', en: 'Order ID' },
  date: { es: 'Fecha', en: 'Date' },
  time: { es: 'Hora', en: 'Time' },
  type: { es: 'Tipo', en: 'Type' },
  status: { es: 'Estado', en: 'Status' },
  total_euros: { es: 'Total (€)', en: 'Total (€)' },
  error_updating_status: { es: 'Error al actualizar estado', en: 'Error updating status' },
  confirm_delete_product: { es: 'ATENCIÓN: Se eliminará permanentemente de la base de datos y de todas partes. ¿Proceder?', en: 'WARNING: It will be permanently deleted from the database and everywhere else. Proceed?' },
  error_deleting_product: { es: 'No se pudo eliminar el producto.', en: 'Could not delete product.' },
  product_deleted_success: { es: 'Producto eliminado totalmente', en: 'Product completely deleted' },
  gestion_profesional: { es: 'Gestión Profesional', en: 'Professional Management' },
  control_total_description: { es: 'Control total sobre base de datos, imágenes y sugerencias.', en: 'Total control over database, images, and suggestions.' },
  carta: { es: 'Carta', en: 'Menu' },
  upsells: { es: 'Upsells', en: 'Upsells' },
  new_category: { es: 'Nueva Categoría', en: 'New Category' },
  new_product: { es: 'Nuevo Producto', en: 'New Product' },
  agrupado: { es: 'AGRUPADO', en: 'GROUPED' },
  no_products_in_category: { es: 'No hay productos en esta categoría.', en: 'There are no products in this category.' },
  no_orders_to_export: { es: 'No hay pedidos para exportar en este rango.', en: 'No orders to export in this range.' },
  reception_blocked: { es: 'Recepción Bloqueada', en: 'Reception Blocked' },
  browser_security_message: { es: 'Por políticas de seguridad del navegador, necesitamos que hagas clic en este botón para poder emitir la alarma sonora cuando lleguen nuevos pedidos.', en: 'Due to browser security policies, we need you to click this button to be able to emit the sound alarm when new orders arrive.' },
  activate_alarm: { es: 'Activar Alarma Sonora', en: 'Activate Sound Alarm' },
  opening_time_title: { es: '¡Hora de Encender los Fogones!', en: 'Time to Fire Up the Kitchen!' },
  opening_time_subtitle: { es: 'Ya es la hora oficial de apertura según el horario.', en: 'It is now the official opening time according to the schedule.' },
  silence_alarm: { es: 'Silenciar Alarma', en: 'Silence Alarm' },
  orders_manager_title: { es: 'Gestor de', en: 'Manager of' },
  new: { es: 'Nuevos', en: 'New' },
  cooking: { es: 'Cocina', en: 'Cooking' },
  delivery_ready: { es: 'Reparto / Listos', en: 'Delivery / Ready' },
  completed: { es: 'Completados', en: 'Completed' },
  no_orders_section: { es: 'No hay pedidos en esta sección', en: 'No orders in this section' },
  tpv_physical: { es: 'TPV FÍSICO', en: 'PHYSICAL POS' },
  vip: { es: 'VIP', en: 'VIP' },
  cancelled: { es: 'CANCELADO', en: 'CANCELLED' },
  total_amount: { es: 'Total Pagar', en: 'Total Amount' },
  product_summary: { es: 'Resumen de Productos', en: 'Products Summary' },
  mark_as: { es: 'Marcar como', en: 'Mark as' },
  login_error: { es: 'Error de inicio de sesión', en: 'Login error' },
  enter_email_to_reset: { es: 'Por favor, ingresa tu email en el campo superior para restablecer la contraseña.', en: 'Please enter your email in the field above to reset your password.' },
  sending: { es: 'Enviando...', en: 'Sending...' },
  store_closed_open: { es: 'TIENDA CERRADA (ABRIR)', en: 'STORE CLOSED (OPEN)' },
  close_store: { es: 'CERRAR TIENDA', en: 'CLOSE STORE' },
  restricted_access: { es: 'Acceso Restringido', en: 'Restricted Access' },
  admin_portal_title: { es: 'Portal exclusivo de administración Kitchen POS', en: 'Exclusive Kitchen POS administration portal' },
  loading: { es: 'Comprobando...', en: 'Loading...' },
  sign_in: { es: 'Entrar al Sistema', en: 'Sign In' },
  or_also: { es: 'O TAMBIÉN', en: 'OR ALSO' },
  back_to_shop: { es: 'Volver a la tienda pública', en: 'Back to public shop' },
  emergency_closure: { es: 'Cierre de Emergencia', en: 'Emergency Closure' },
  vip_discount_applied: { es: 'Descuento Club VIP Aplicado', en: 'VIP Club Discount Applied' },
  client_details: { es: 'Datos del Cliente', en: 'Client Details' },
  
  // Error Boundary
  error_title: { es: '¡Ups! Algo salió mal.', en: 'Oops! Something went wrong.' },
  error_desc: { es: 'Nuestra cocina ha tenido un pequeño fallo técnico. Por favor, recarga la página para volver a la normalidad.', en: 'Our kitchen had a small technical failure. Please, reload the page to return to normal.' },
  reload_page: { es: 'Recargar Página', en: 'Reload Page' },
  
  // Modals & New Strings
  error_integrity: { es: 'Error de integridad en el pedido. Por favor, recarga la página e inténtalo de nuevo.', en: 'Order integrity error. Please reload the page and try again.' },
  error_too_many: { es: 'Has realizado demasiados pedidos en poco tiempo. Espera unos minutos.', en: 'You have placed too many orders in a short time. Wait a few minutes.' },
  error_unavailable: { es: 'Un artículo de tu carrito ya no está disponible. Por favor, retíralo e inténtalo de nuevo.', en: 'An item in your cart is no longer available. Please remove it and try again.' },
  error_processing: { es: 'Hubo un error procesando el pedido. Por favor, inténtalo de nuevo.', en: 'There was an error processing the order. Please try again.' },
  
  geofence_no_support: { es: 'Tu navegador no soporta geolocalización. Necesitamos validar tu ubicación para asegurar que podrás recibir tu pedido caliente.', en: 'Your browser does not support geolocation. We need to validate your location to ensure you can enjoy your food hot.' },
  geofence_too_far: { es: 'Nuestro radio máximo para realizar pedidos por la app es de 10 km. Para pedidos excepcionales o de alto volumen, contáctanos.', en: 'Our maximum radius for app orders is 10 km. For exceptional or high-volume orders, contact us.' },
  geofence_denied: { es: 'Necesitamos acceso a tu ubicación para verificar el radio de cobertura. Por favor, actívala en tu navegador.', en: 'We need access to your location to verify delivery coverage area. Please enable it in your browser.' },
  distance_away: { es: 'Estás a', en: 'You are' },
  km_from_delivery_point: { es: 'km del punto de reparto.', en: 'km from the delivery point.' },

  // Landing /registro — copy de alto impacto (reutilizable para marca blanca y nuevas ubicaciones)
  landing_badge: { es: 'Club de Fidelización VIP', en: 'VIP Loyalty Club' },
  landing_hero_title: { es: 'GASTRONOMÍA PREMIUM.\nPEDIDO EN SEGUNDOS.\nEN TU PUERTA EN MINUTOS.', en: 'PREMIUM FOOD.\nORDER IN SECONDS.\nAT YOUR DOOR IN MINUTES.' },
  landing_hero_subtitle: { es: 'Regístrate gratis y entra al Club VIP: acumulas puntos con cada pedido y los canjeas por tus platos favoritos gratis. Sin trucos, sin letra pequeña.', en: 'Sign up for free and join the VIP Club: earn points with every order and redeem them for your favorite items free. No tricks, no fine print.' },
  landing_cta_primary: { es: 'Quiero mi cuenta gratis', en: 'I want my free account' },
  landing_cta_secondary: { es: 'Ver la carta', en: 'See the menu' },
  landing_trust_1: { es: 'Pedido en menos de 2 minutos', en: 'Order in under 2 minutes' },
  landing_trust_2: { es: 'Ingredientes 100% frescos y seleccionados', en: '100% fresh, selected ingredients' },
  landing_trust_3: { es: 'Entrega o recogida en tu zona', en: 'Delivery or pickup in your area' },

  landing_steps_title: { es: 'Así de simple', en: 'This simple' },
  landing_step1_title: { es: 'Regístrate', en: 'Sign up' },
  landing_step1_desc: { es: '30 segundos. Solo nombre, teléfono y email.', en: '30 seconds. Just name, phone and email.' },
  landing_step2_title: { es: 'Pide', en: 'Order' },
  landing_step2_desc: { es: 'Elige tus platos, personalízalos y confirma.', en: 'Choose your dishes, customize them and confirm.' },
  landing_step3_title: { es: 'Gana y canjea', en: 'Earn and redeem' },
  landing_step3_desc: { es: 'Suma puntos en cada pedido y consigue comida gratis.', en: 'Earn points with every order and get free food.' },

  landing_vip_title: { es: 'CLUB VIP DE PUNTOS', en: 'VIP POINTS CLUB' },
  landing_vip_rate: { es: 'Por cada 10€ en tu pedido', en: 'For every €10 in your order' },
  landing_vip_points: { es: '+4 puntos', en: '+4 points' },
  landing_vip_reward_label: { es: 'Desde 25 puntos acumulados', en: 'From 25 points accumulated' },
  landing_vip_reward: { es: 'el producto que TÚ elijas de tu pedido, GRATIS', en: 'the product YOU choose from your order, FREE' },

  landing_menu_title: { es: 'Nuestra carta te está esperando', en: 'Our menu is waiting for you' },
  landing_why_title: { es: '¿Por qué elegirnos?', en: 'Why choose us?' },
  landing_why_1_title: { es: 'Calidad Artesanal', en: 'Artisan Quality' },
  landing_why_1_desc: { es: 'Ingredientes frescos preparados a diario, sin procesos industriales.', en: 'Fresh ingredients prepared daily, no industrial processes.' },
  landing_why_2_title: { es: 'Recetas de Autor', en: 'Signature Recipes' },
  landing_why_2_desc: { es: 'Salsas y platos elaborados con recetas propias y productos de proximidad.', en: 'Sauces and dishes prepared with signature recipes and local produce.' },
  landing_why_3_title: { es: 'A tu medida', en: 'Made your way' },
  landing_why_3_desc: { es: 'Personaliza tus platos y crea combinaciones a tu gusto.', en: 'Customize your dishes and create combinations to your taste.' },

  landing_final_cta_title: { es: '¿A qué esperas?', en: 'What are you waiting for?' },
  landing_final_cta_subtitle: { es: 'Crea tu cuenta gratis y tu primer pedido ya empieza a sumar puntos VIP.', en: 'Create your free account and your first order already starts earning VIP points.' },

  landing_form_title: { es: 'Crea tu cuenta gratis', en: 'Create your free account' },
  landing_form_name: { es: 'Nombre completo', en: 'Full name' },
  landing_form_phone: { es: 'Teléfono', en: 'Phone' },
  landing_form_legal_prefix: { es: 'Acepto los ', en: 'I accept the ' },
  landing_form_legal_link: { es: 'Términos y la Política de Privacidad', en: 'Terms and Privacy Policy' },
  landing_form_submit: { es: 'Crear mi cuenta VIP', en: 'Create my VIP account' },
  landing_form_error_legal: { es: 'Debes aceptar los términos y la política de privacidad para continuar.', en: 'You must accept the terms and privacy policy to continue.' },
  landing_success_title: { es: '¡Ya eres parte del Club VIP!', en: 'You are now part of the VIP Club!' },
  landing_success_desc: { es: 'Tu cuenta está lista. Empieza a pedir y suma tus primeros puntos.', en: 'Your account is ready. Start ordering and earn your first points.' },
  landing_success_cta: { es: 'Empezar a pedir ahora', en: 'Start ordering now' },
};

const dynamicDictionary: Record<string, string> = {
  // Términos comunes de menú gastronómico
  'EXTRAS': 'EXTRAS',
  'BEBIDAS': 'DRINKS',
  'POSTRES': 'DESSERTS',
  'SALSAS': 'SAUCES',
  'ENTRANTES': 'STARTERS',
  'PRINCIPALES': 'MAINS',
  'COMBOS': 'COMBOS',
  'ALITAS': 'WINGS',
  'TENDERS': 'TENDERS',
  'PATATAS': 'FRIES',
  'PATATAS GOURMET': 'GOURMET FRIES',

  // Toppings / modificadores estándar
  'CEBOLLA CRUJIENTE': 'CRISPY ONION',
  'BACON': 'BACON',
  'POLLO TERIYAKI': 'TERIYAKI CHICKEN',
  'PULLED PORK': 'PULLED PORK',
  'CHORIZO': 'CHORIZO',
  'JALAPEÑOS': 'JALAPEÑOS',
  'PICO DE GALLO': 'PICO DE GALLO',
  'GUACAMOLE': 'GUACAMOLE',
  'EXTRA CHEDDAR FUNDIDO': 'EXTRA MELTED CHEDDAR',
  'ACEITUNAS NEGRAS': 'BLACK OLIVES',
  'MAÍZ': 'CORN',
  'CHAMPIÑÓN': 'MUSHROOM',
  'HUEVO': 'EGG',
  'SÉSAMO TOSTADO': 'TOASTED SESAME',
  'SALSA CHIPOTLE': 'CHIPOTLE SAUCE',
  'SALSA CHEDDAR-JALAPEÑO': 'CHEDDAR-JALAPEÑO SAUCE',
  'SALSA RANCH-CHEDDAR': 'RANCH-CHEDDAR SAUCE',
  'ALIOLI DE AJO': 'GARLIC AIOLI',
  'SALSA BBQ': 'BBQ SAUCE',
  'CREMA AGRIA': 'SOUR CREAM',

  // Genéricos y etiquetas
  'NUEVO': 'NEW',
  'PICANTE': 'SPICY',
  'VEGANO': 'VEGAN',
  'VEGETARIANO': 'VEGETARIAN',
  'AGUAS': 'WATER',
  'CERVEZAS': 'BEERS',
  'REFRESCOS GRANDES': 'LARGE SOFT DRINKS',
  'REFRESCOS': 'SOFT DRINKS',
};

interface I18nState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
  tDynamic: (text: string) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      lang: 'es',
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((state) => ({ lang: state.lang === 'es' ? 'en' : 'es' })),
      t: (key) => {
        const lang = get().lang;
        return dictionary[key]?.[lang] || key;
      },
      tDynamic: (text) => {
        if (!text) return text;
        const lang = get().lang;
        if (lang === 'es') return text;
        
        const upperText = text.toUpperCase();
        
        // Match exact first
        if (dynamicDictionary[upperText]) {
          const translated = dynamicDictionary[upperText];
          if (text === upperText) return translated;
          if (text[0] === text[0].toUpperCase()) {
            return translated.charAt(0) + translated.slice(1).toLowerCase();
          }
          return translated.toLowerCase();
        }
        
        // Text replacement for descriptions
        let translatedText = text;
        // Sort keys by length descending to replace longer phrases first
        const keys = Object.keys(dynamicDictionary).sort((a, b) => b.length - a.length);
        
        keys.forEach(esWord => {
          const regex = new RegExp(`(?<=\\b|\\s|^)(${esWord})(?=\\b|\\s|$)`, 'gi');
          translatedText = translatedText.replace(regex, (match) => {
            const enWord = dynamicDictionary[esWord];
            if (match === match.toUpperCase()) return enWord;
            if (match[0] === match[0].toUpperCase()) return enWord.charAt(0) + enWord.slice(1).toLowerCase();
            return enWord.toLowerCase();
          });
        });
        
        return translatedText;
      },
    }),
    {
      name: 'brand-i18n-storage',
    }
  )
);
