# NestinoKids API Documentation

## Base URL

```
http://localhost:8000/api/v1
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All responses follow this format:

```json
{
  "status": "success|error",
  "message": "Response message",
  "data": {},
  "errors": []
}
```

## Endpoints

### Authentication

#### Register User
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "9876543210",
  "password": "SecurePassword123"
}

Response: 201 Created
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "role": "user",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123"
}

Response: 200 OK
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "is_active": true,
    "role": "user"
  }
}
```

#### Refresh Token
```
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response: 200 OK
{
  "access_token": "new_access_token",
  "token_type": "bearer"
}
```

#### Get Current User
```
GET /auth/me
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "is_active": true,
  "role": "user",
  "profile_image": null,
  "date_of_birth": null
}
```

#### Update Current User
```
PUT /auth/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "first_name": "Jane",
  "profile_image": "https://example.com/image.jpg"
}

Response: 200 OK
(Updated user object)
```

### Products

#### Get All Products
```
GET /products?skip=0&limit=20&category_id=1&search=bloomer&featured=true&sort_by=price

Query Parameters:
- skip: Offset (default: 0)
- limit: Page size (default: 20, max: 100)
- category_id: Filter by category
- search: Search in name and description
- featured: Filter featured products (true/false)
- sort_by: Sort by (price, rating, created_at)

Response: 200 OK
[
  {
    "id": 1,
    "name": "Kids Bloomers",
    "slug": "kids-bloomers",
    "price": 299.99,
    "discount_price": 249.99,
    "rating": 4.5,
    "review_count": 12,
    "is_featured": true,
    "images": [...],
    "variants": [...]
  }
]
```

#### Get Product by Slug
```
GET /products/kids-bloomers

Response: 200 OK
{
  "id": 1,
  "name": "Kids Bloomers",
  "slug": "kids-bloomers",
  "description": "Soft and comfortable bloomers...",
  "price": 299.99,
  "discount_price": 249.99,
  "rating": 4.5,
  "review_count": 12,
  "images": [
    {
      "id": 1,
      "image_url": "https://cdn.example.com/image.jpg",
      "alt_text": "Front view",
      "is_primary": true
    }
  ],
  "variants": [
    {
      "id": 1,
      "size": "M",
      "color": "Pink",
      "quantity": 50
    }
  ]
}
```

#### Get Categories
```
GET /categories?skip=0&limit=10

Response: 200 OK
[
  {
    "id": 1,
    "name": "Kids Bloomers",
    "slug": "kids-bloomers",
    "description": "...",
    "image": "https://...",
    "is_active": true
  }
]
```

#### Get Category by Slug
```
GET /categories/kids-bloomers

Response: 200 OK
(Category object)
```

#### Search Products
```
GET /search?q=bloomer&category_id=1&skip=0&limit=20

Response: 200 OK
{
  "query": "bloomer",
  "total": 5,
  "results": [...]
}
```

#### Get Product Reviews
```
GET /products/1/reviews?skip=0&limit=10

Response: 200 OK
[
  {
    "id": 1,
    "rating": 5,
    "title": "Excellent product",
    "description": "Very comfortable for my daughter",
    "user_id": 1,
    "is_verified_purchase": true,
    "helpful_count": 5,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Create Review
```
POST /products/1/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "title": "Excellent product",
  "description": "Very comfortable for my daughter"
}

Response: 201 Created
(Review object)
```

#### Get Related Products
```
GET /products/1/related?limit=5

Response: 200 OK
[...] (Array of related products)
```

### Shopping

#### Get Cart
```
GET /cart
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": 1,
    "name": "Kids Bloomers",
    "price": 249.99,
    "quantity": 2,
    "total": 499.98,
    "images": [...]
  }
]
```

#### Add to Cart
```
POST /cart/1?quantity=2&variant_id=1
Authorization: Bearer <access_token>

Response: 201 Created
{
  "message": "Product added to cart"
}
```

#### Remove from Cart
```
DELETE /cart/1
Authorization: Bearer <access_token>

Response: 200 OK
{
  "message": "Product removed from cart"
}
```

#### Get Wishlist
```
GET /wishlist
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": 1,
    "name": "Kids Bloomers",
    "price": 249.99,
    "images": [...]
  }
]
```

#### Add to Wishlist
```
POST /wishlist/1
Authorization: Bearer <access_token>

Response: 201 Created
{
  "message": "Product added to wishlist"
}
```

#### Remove from Wishlist
```
DELETE /wishlist/1
Authorization: Bearer <access_token>

Response: 200 OK
{
  "message": "Product removed from wishlist"
}
```

### Addresses

#### Get User Addresses
```
GET /addresses
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "address_line_1": "123 Main St",
    "city": "Delhi",
    "state": "Delhi",
    "postal_code": "110001",
    "country": "India",
    "is_default": true,
    "address_type": "residential"
  }
]
```

#### Create Address
```
POST /addresses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "9876543210",
  "email": "john@example.com",
  "address_line_1": "123 Main St",
  "address_line_2": "Apt 4B",
  "city": "Delhi",
  "state": "Delhi",
  "postal_code": "110001",
  "country": "India",
  "is_default": false,
  "address_type": "residential"
}

Response: 201 Created
(Address object)
```

#### Update Address
```
PUT /addresses/1
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "address_line_1": "456 Oak Ave"
}

Response: 200 OK
(Updated address object)
```

#### Delete Address
```
DELETE /addresses/1
Authorization: Bearer <access_token>

Response: 200 OK
{
  "message": "Address deleted successfully"
}
```

### Orders

#### Create Order
```
POST /orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "variant_id": 1
    }
  ],
  "shipping_address_id": 1,
  "billing_address_id": 1,
  "payment_method": "razorpay",
  "coupon_code": "SUMMER20"
}

Response: 201 Created
{
  "id": 1,
  "order_number": "ORD-20240115-ABC123",
  "status": "pending",
  "total_amount": 499.98,
  "discount_amount": 50,
  "tax_amount": 45,
  "shipping_amount": 50,
  "final_amount": 544.98,
  "payment_status": "pending",
  "created_at": "2024-01-15T10:30:00Z",
  "items": [...]
}
```

#### Get User Orders
```
GET /orders
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": 1,
    "order_number": "ORD-20240115-ABC123",
    "status": "shipped",
    "final_amount": 544.98,
    "payment_status": "completed",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

#### Get Specific Order
```
GET /orders/1
Authorization: Bearer <access_token>

Response: 200 OK
(Order object with items)
```

### Coupons

#### Validate Coupon
```
GET /coupons/SUMMER20?total_amount=500

Response: 200 OK
{
  "id": 1,
  "code": "SUMMER20",
  "discount_type": "percentage",
  "discount_value": 20,
  "minimum_order_value": 300,
  "maximum_discount": 500,
  "is_active": true
}

Response: 404 Not Found (if coupon doesn't exist or expired)
```

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 204 | No Content - No response body |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

## Rate Limiting

Currently unlimited. Production should implement:
- 100 requests per minute for anonymous users
- 1000 requests per minute for authenticated users

## Error Responses

```json
{
  "detail": "Error message"
}
```

Or with field errors:

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "Invalid email format",
      "type": "value_error"
    }
  ]
}
```

## Pagination

Use `skip` and `limit` query parameters:
```
GET /products?skip=0&limit=20
GET /products?skip=20&limit=20  # Page 2
```

## Sorting

Use `sort_by` parameter with allowed values:
```
/products?sort_by=price       # Ascending
/products?sort_by=rating      # Descending
/products?sort_by=created_at  # Newest first
```

## Testing API

Use Swagger UI:
```
http://localhost:8000/docs
```

Or ReDoc:
```
http://localhost:8000/redoc
```

---

For architecture details, see [ARCHITECTURE.md](ARCHITECTURE.md)
