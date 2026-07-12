const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const shops = [
  { id: 1, name: "Green Basket", category: "Grocery", distance: "0.7 km", rating: "4.8", eta: "22 min", image: "grocery", letter: "G" },
  { id: 2, name: "Care Plus Pharmacy", category: "Pharmacy", distance: "1.1 km", rating: "4.7", eta: "28 min", image: "pharmacy", letter: "P" },
  { id: 3, name: "Sunrise Bakery", category: "Bakery", distance: "1.5 km", rating: "4.6", eta: "35 min", image: "bakery", letter: "B" },
  { id: 4, name: "Daily Dairy Hub", category: "Dairy", distance: "0.9 km", rating: "4.9", eta: "18 min", image: "dairy", letter: "D" }
];

const products = [
  { id: 101, name: "Fresh Vegetable Combo", shop: "Green Basket", price: 149, tag: "Fresh", image: "fresh", letter: "V", stock: 48 },
  { id: 102, name: "Cold Relief Kit", shop: "Care Plus Pharmacy", price: 219, tag: "Medicine", image: "medicine", letter: "M", stock: 13 },
  { id: 103, name: "Whole Wheat Bread", shop: "Sunrise Bakery", price: 55, tag: "Bakery", image: "bread", letter: "B", stock: 32 },
  { id: 104, name: "Paneer and Milk Pack", shop: "Daily Dairy Hub", price: 178, tag: "Dairy", image: "milk", letter: "D", stock: 18 },
  { id: 105, name: "Notebook Set", shop: "Campus Stationery", price: 120, tag: "Stationery", image: "stationery", letter: "S", stock: 60 },
  { id: 106, name: "Phone Charger", shop: "Quick Electronics", price: 399, tag: "Electronics", image: "electronics", letter: "E", stock: 22 }
];

let cart = [
  { productId: 101, quantity: 1 },
  { productId: 103, quantity: 2 }
];

let orders = [
  {
    id: "LK2045",
    status: "Out for Delivery",
    eta: "24 min",
    partner: "Rahul Sharma",
    address: "MG Road, Bengaluru",
    paymentMethod: "UPI",
    items: cart,
    createdAt: new Date().toISOString()
  }
];

const dashboard = {
  customer: {
    deliveryTarget: "60 min"
  },
  vendor: {
    ordersToday: 42,
    dailyRevenue: 18450,
    stockAccuracy: "96%",
    incomingOrders: [
      { id: "Order #LK2045", items: 3, payment: "UPI paid", action: "Accept" },
      { id: "Order #LK2046", items: 5, payment: "COD", action: "Pack" },
      { id: "Order #LK2047", items: 2, payment: "UPI paid", action: "Ready" }
    ]
  },
  delivery: {
    completedToday: 8,
    earnings: 920,
    rating: "4.9",
    active: { id: "Order #LK2045", pickup: "Green Basket", drop: "MG Road" },
    assignments: [
      { shop: "Care Plus Pharmacy", distance: "1.8 km", pay: 85 },
      { shop: "Sunrise Bakery", distance: "2.2 km", pay: 95 }
    ]
  },
  admin: {
    users: "1,284",
    vendors: "100+",
    orders: "312",
    gmv: 482000,
    vendorReviews: [
      { name: "Campus Stationery", note: "GST and address pending", status: "Review", color: "amber" },
      { name: "Fresh Leaf Mart", note: "All documents uploaded", status: "Approve", color: "green" },
      { name: "Quick Electronics", note: "Identity mismatch", status: "Reject", color: "red" }
    ],
    analytics: [
      { name: "Order completion", target: "95% target", value: "96.2%", color: "green" },
      { name: "Cancellation rate", target: "Below 5% target", value: "3.8%", color: "blue" },
      { name: "Support resolution", target: "24 hour target", value: "18 hr", color: "green" }
    ]
  }
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

function cartWithProducts() {
  return cart
    .map(item => {
      const product = products.find(productItem => productItem.id === item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        name: product.name,
        shop: product.shop,
        price: product.price,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity
      };
    })
    .filter(Boolean);
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = crypto.createHash("sha256").update(payload + ".local-kart-demo").digest("base64url");
  return `${payload}.${signature}`;
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    return sendText(res, 204, "");
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readBody(req);
    const user = {
      id: Date.now(),
      name: body.name || "Local Kart User",
      email: body.email,
      role: body.role || "customer"
    };
    return sendJson(res, 201, { user, token: createToken(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(req);
    const role = body.role || "customer";
    const user = { id: 1, name: `${role} demo`, email: body.email || `${role}@localkart.in`, role };
    return sendJson(res, 200, { user, token: createToken(user) });
  }

  if (req.method === "GET" && url.pathname === "/api/shops") {
    return sendJson(res, 200, shops);
  }

  if (req.method === "GET" && url.pathname === "/api/products") {
    const category = url.searchParams.get("category");
    const filtered = category && category !== "All"
      ? products.filter(product => product.tag.toLowerCase() === category.toLowerCase())
      : products;
    return sendJson(res, 200, filtered);
  }

  if (req.method === "GET" && url.pathname === "/api/cart") {
    return sendJson(res, 200, cartWithProducts());
  }

  if (req.method === "POST" && url.pathname === "/api/cart") {
    const body = await readBody(req);
    const productId = Number(body.productId);
    const product = products.find(item => item.id === productId);
    if (!product) return sendText(res, 404, "Product not found");

    const existing = cart.find(item => item.productId === productId);
    if (existing) {
      existing.quantity += Number(body.quantity || 1);
    } else {
      cart.push({ productId, quantity: Number(body.quantity || 1) });
    }
    return sendJson(res, 200, cartWithProducts());
  }

  const cartItemMatch = url.pathname.match(/^\/api\/cart\/(\d+)$/);
  if (req.method === "PATCH" && cartItemMatch) {
    const productId = Number(cartItemMatch[1]);
    const body = await readBody(req);
    const quantity = Number(body.quantity);
    if (quantity <= 0) {
      cart = cart.filter(item => item.productId !== productId);
    } else {
      const existing = cart.find(item => item.productId === productId);
      if (existing) existing.quantity = quantity;
    }
    return sendJson(res, 200, cartWithProducts());
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const body = await readBody(req);
    if (cart.length === 0) return sendText(res, 400, "Cart is empty");

    const order = {
      id: `LK${Math.floor(3000 + Math.random() * 6000)}`,
      status: "Confirmed",
      eta: "35 min",
      partner: "Assigning soon",
      address: body.address || "MG Road, Bengaluru",
      paymentMethod: body.paymentMethod || "UPI",
      items: cartWithProducts(),
      createdAt: new Date().toISOString()
    };
    orders.unshift(order);
    cart = [];
    return sendJson(res, 201, order);
  }

  if (req.method === "GET" && url.pathname === "/api/orders/latest") {
    return sendJson(res, 200, orders[0] || null);
  }

  const orderStatusMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/status$/);
  if (req.method === "PATCH" && orderStatusMatch) {
    const body = await readBody(req);
    const order = orders.find(item => item.id === orderStatusMatch[1]);
    if (!order) return sendText(res, 404, "Order not found");
    order.status = body.status || order.status;
    order.eta = body.eta || order.eta;
    order.partner = body.partner || order.partner;
    return sendJson(res, 200, order);
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    return sendJson(res, 200, dashboard);
  }

  return sendText(res, 404, "API route not found");
}

function serveStatic(req, res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(PUBLIC_DIR, requestedPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, "Forbidden");
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json"
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      return sendText(res, 404, "File not found");
    }
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      serveStatic(req, res, url);
    }
  } catch (error) {
    sendText(res, 500, error.message);
  }
});

server.listen(PORT, () => {
  console.log(`Local Kart running at http://localhost:${PORT}`);
});
