# Payment Integration Guide - Razorpay

## Setup Instructions

### 1. Create Razorpay Account

1. Go to [Razorpay](https://razorpay.com)
2. Sign up for a merchant account
3. Complete KYC verification
4. Get your API credentials from Dashboard

### 2. Backend Configuration

Update `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxx
```

### 3. Backend Implementation

Create payment service file: `backend/app/services/payment.py`

```python
import razorpay
from app.core.config import settings

class RazorpayService:
    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
    
    def create_order(self, amount, order_id, description=""):
        """Create Razorpay order"""
        return self.client.order.create({
            "amount": int(amount * 100),  # Amount in paise
            "currency": "INR",
            "receipt": order_id,
            "description": description,
            "notes": {
                "order_id": order_id
            }
        })
    
    def verify_payment(self, payment_id, signature, order_id):
        """Verify payment signature"""
        try:
            self.client.utility.verify_payment_signature({
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            })
            return True
        except:
            return False
    
    def capture_payment(self, payment_id, amount):
        """Capture payment"""
        return self.client.payment.capture(payment_id, int(amount * 100))
```

### 4. Create Payment Endpoints

Add to `backend/app/api/v1/endpoints/payments.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.payment import RazorpayService
from app.models.models import Order, PaymentStatusEnum
from app.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])
payment_service = RazorpayService()

@router.post("/create-order/{order_id}")
def create_payment_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Razorpay order"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    try:
        razorpay_order = payment_service.create_order(
            order.final_amount,
            order.order_number,
            f"Order {order.order_number}"
        )
        
        order.razorpay_order_id = razorpay_order['id']
        db.add(order)
        db.commit()
        
        return {
            "razorpay_order_id": razorpay_order['id'],
            "key_id": settings.RAZORPAY_KEY_ID,
            "amount": order.final_amount,
            "currency": "INR",
            "customer_name": f"{current_user.first_name} {current_user.last_name}",
            "customer_email": current_user.email
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-payment")
def verify_payment(
    payment_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verify payment and update order"""
    try:
        is_valid = payment_service.verify_payment(
            payment_data['razorpay_payment_id'],
            payment_data['razorpay_signature'],
            payment_data['razorpay_order_id']
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail="Payment verification failed")
        
        # Update order status
        order = db.query(Order).filter(
            Order.razorpay_order_id == payment_data['razorpay_order_id']
        ).first()
        
        if order:
            order.razorpay_payment_id = payment_data['razorpay_payment_id']
            order.payment_status = PaymentStatusEnum.COMPLETED
            order.status = OrderStatusEnum.CONFIRMED
            db.add(order)
            db.commit()
            
            return {
                "status": "success",
                "message": "Payment verified successfully",
                "order_id": order.id
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 5. Frontend Implementation

Create payment component: `frontend/src/components/PaymentForm.jsx`

```jsx
import React, { useState } from 'react';
import { shoppingAPI } from '../api/endpoints';

const PaymentForm = ({ orderId, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // Create order
      const response = await fetch('/api/v1/payments/create-order/' + orderId, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const data = await response.json();
      
      // Initialize Razorpay
      const options = {
        key: data.key_id,
        amount: data.amount * 100,
        currency: data.currency,
        name: 'NestinoKids',
        description: 'Purchase from NestinoKids',
        order_id: data.razorpay_order_id,
        customer_email: data.customer_email,
        handler: async (response) => {
          // Verify payment
          await fetch('/api/v1/payments/verify-payment', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          
          onSuccess();
        },
        prefill: {
          name: data.customer_name,
          email: data.customer_email
        }
      };
      
      const Razorpay = window.Razorpay;
      new Razorpay(options).open();
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full bg-gold text-white py-3 rounded-lg font-bold"
    >
      {loading ? 'Processing...' : 'Pay Now'}
    </button>
  );
};

export default PaymentForm;
```

Add to `frontend/index.html`:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 6. Webhook Integration (Optional but Recommended)

```python
@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Razorpay webhooks"""
    import hmac
    import hashlib
    
    # Verify webhook signature
    signature = request.headers.get('X-Razorpay-Signature')
    body = await request.body()
    
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if signature != expected_signature:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    payload = await request.json()
    
    # Handle different webhook events
    if payload['event'] == 'payment.authorized':
        # Update order payment status
        pass
    elif payload['event'] == 'payment.failed':
        # Handle failed payment
        pass
    
    return {"status": "ok"}
```

## Testing

### Test Cards

Razorpay provides test cards for sandbox testing:

- **Success**: 4111 1111 1111 1111
- **Failure**: 4111 1111 1111 1112
- **Invalid Card**: 4111 1111 1111 1113

### Environment Variables for Testing

```env
# .env for development
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxx
```

## Security Checklist

- [ ] Store API credentials securely
- [ ] Use environment variables (never hardcode)
- [ ] Verify signatures on server
- [ ] Use HTTPS in production
- [ ] Implement webhook signature verification
- [ ] Log all payment transactions
- [ ] Never expose full card numbers
- [ ] Implement retry logic for failed payments
- [ ] Set up monitoring for payment failures

## Documentation

- [Razorpay Python SDK](https://github.com/razorpay/razorpay-python)
- [Razorpay API Reference](https://razorpay.com/docs/api/)
- [Razorpay Payment Link](https://razorpay.com/docs/payments/payment-links/)

## Support

For issues:
1. Check Razorpay Dashboard for payment status
2. Review webhook logs
3. Contact Razorpay support: support@razorpay.com
