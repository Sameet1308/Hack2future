import { Routes, Route, Navigate } from 'react-router-dom';
import TopProgress from './components/TopProgress.jsx';
import Landing from './Landing.jsx';

// Customer flow
import CustomerLogin from './customer/Login.jsx';
import CustomerDashboard from './customer/Dashboard.jsx';
import Initiate from './customer/Initiate.jsx';
import LossType from './customer/LossType.jsx';
import Questions from './customer/Questions.jsx';
import Documents from './customer/Documents.jsx';
import Review from './customer/Review.jsx';
import Processing from './customer/Processing.jsx';
import Success from './customer/Success.jsx';
import Settlement from './customer/Settlement.jsx';
import DamageAssess from './customer/DamageAssess.jsx';
import Chat from './customer/Chat.jsx';

// Handler flow
import HandlerSignIn from './handler/SignIn.jsx';
import HandlerLayout from './handler/Layout.jsx';
import Queue from './handler/Queue.jsx';
import ClaimDetail from './handler/ClaimDetail.jsx';
import Theater from './handler/Theater.jsx';

export default function App() {
  return (
    <>
    <TopProgress />
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Customer routes */}
      <Route path="/customer" element={<Navigate to="/customer/login" replace />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/customer/dashboard" element={<CustomerDashboard />} />
      <Route path="/customer/initiate" element={<Initiate />} />
      <Route path="/customer/loss-type" element={<LossType />} />
      <Route path="/customer/questions" element={<Questions />} />
      <Route path="/customer/documents" element={<Documents />} />
      <Route path="/customer/review" element={<Review />} />
      <Route path="/customer/chat" element={<Chat />} />
      <Route path="/customer/processing" element={<Processing />} />
      <Route path="/customer/processing/:id" element={<Processing />} />
      <Route path="/customer/success" element={<Success />} />
      <Route path="/customer/settlement" element={<Settlement />} />
      <Route path="/customer/settlement/:id" element={<Settlement />} />
      <Route path="/customer/assess" element={<DamageAssess />} />

      {/* Handler routes */}
      <Route path="/handler" element={<Navigate to="/handler/signin" replace />} />
      <Route path="/handler/signin" element={<HandlerSignIn />} />
      <Route element={<HandlerLayout />}>
        <Route path="/handler/queue" element={<Queue />} />
        <Route path="/handler/claim/:id" element={<ClaimDetail />} />
      </Route>
      {/* Theater renders its own full-screen chrome (no HandlerLayout) */}
      <Route path="/handler/theater/:id" element={<Theater />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
