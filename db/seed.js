const bcrypt = require("bcrypt");
const db = require("./client");

async function seed() {
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    console.log("Connected to DB");

    await client.query(`
      TRUNCATE TABLE
        comments,
        reviews,
        order_items,
        payments,
        catering_requests,
        orders,
        products,
        users
      RESTART IDENTITY                    
      CASCADE;                            
    `);

    const plainPasswords = [
      "Password1!",
      "Password2!",
      "Password3!",
      "Password4!",
      "Password5!",
      "Password6!",
      "Password7!",
      "Password8!",
    ];
    const hashedPasswords = await Promise.all(
      plainPasswords.map(function (plainPassword) {
        return bcrypt.hash(plainPassword, 10);
      }),
    );

    const products = [
      ["Chocolate Chip Batch Box", 19.95, "chocolate-chip", 0],
      ["Double Chocolate Chip Batch Box", 19.95, "double-chocolate-chip", 0],
      ["Peanut Butter Batch Box", 19.95, "peanut-butter", 0],
      ["Oatmeal Raisin Batch Box", 19.95, "oatmeal-raisin", 0],
      ["White Chocolate Macadamia Nut Batch Box", 21.95, "white-chocolate-macadamia", 0],
      ["Assortment Batch Box", 22.95, "assortment-cookies", 0]
    ];

    const productIds = [];
    for (const product of products) {
      const { rows } = await client.query(
        `INSERT INTO products (name, price, image_key, star_rating)           
         VALUES ($1,$2,$3,$4)                                                 
         RETURNING product_id`,
        product,
      );
      productIds.push(rows[0].product_id);
    }
    console.log(`✅ Inserted ${productIds.length} products`);

    const users = [
      [
        "Alice Smith",
        "alice@example.com",
        hashedPasswords[0],
        "123 Apple St Austin TX 78705",
        "512-555-1234",
        "customer",
      ],
      [
        "Bob Johnson",
        "bob@example.com",
        hashedPasswords[1],
        "456 Orange Ave Arlington TX 78613",
        "682-555-5678",
        "customer",
      ],
      [
        "Charlie Brown",
        "charlie.brown@example.com",
        hashedPasswords[2],
        "789 Peach Blvd Dallas TX 75201",
        "214-555-2345",
        "customer",
      ],
      [
        "Dana White",
        "dana.white@example.com",
        hashedPasswords[3],
        "1010 Grape St Lubbock TX 79401",
        "806-555-3456",
        "customer",
      ],
      [
        "Evelyn King",
        "evelyn.king@example.com",
        hashedPasswords[4],
        "2020 Banana Rd San Marcos TX 78666",
        "512-555-4567",
        "customer",
      ],
      [
        "Frank Castle",
        "frank.castle@example.com",
        hashedPasswords[5],
        "3030 Cherry Ln San Antonio TX 78282",
        "210-555-5678",
        "customer",
      ],
      [
        "Grace Lee",
        "grace.lee@example.com",
        hashedPasswords[6],
        "4040 Blueberry Dr Fredericksburg TX 78624",
        "830-555-6789",
        "customer",
      ],
      [
        "Henry Ford",
        "henry.ford@example.com",
        hashedPasswords[7],
        "5050 Pumpkin Way Galveston TX 77550",
        "409-555-7890",
        "admin",
      ],
    ];

    const userIds = [];
    for (const user of users) {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password, address, phone, role)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING user_id`,
        user,
      );
      userIds.push(rows[0].user_id);
    }
    console.log(`✅ Inserted ${userIds.length} users`);

    function daysFromNow(days) {
      const today = new Date();
      today.setDate(today.getDate() + days);
      return today.toISOString();
    }

    const ordersData = [
      [userIds[0], "Completed", 39.9, daysFromNow(-10)],
      [userIds[1], "Completed", 21.95, daysFromNow(-7)],
      [userIds[2], "Cancelled", 19.95, daysFromNow(-3)],
      [userIds[3], "Preparing", 59.85, daysFromNow(1)],
      [userIds[4], "Pending", 41.9, daysFromNow(2)],
      [userIds[5], "Ready", 39.9, daysFromNow(0)],
      [userIds[6], "Pending", 79.8, daysFromNow(3)],
    ];

    const orderIds = [];
    for (const order of ordersData) {
      const { rows } = await client.query(
        `INSERT INTO orders (user_id,status,total_amount,pickup_time)
         VALUES ($1,$2,$3,$4)
         RETURNING order_id`,
        order,
      );
      orderIds.push(rows[0].order_id);
    }
    console.log(`✅ Inserted ${orderIds.length} orders`);

    const payments = [
      [orderIds[0], "TXN-1001", 39.9, "Completed", "Debit"],
      [orderIds[1], "TXN-1002", 21.95, "Completed", "Credit"],
      [orderIds[2], "TXN-1003", 19.95, "Refunded", "Debit"],
      [orderIds[3], "TXN-1004", 59.85, "Completed", "Debit"],
      [orderIds[4], "TXN-1005", 41.9, "Pending", "Credit"],
      [orderIds[5], "TXN-1006", 39.9, "Completed", "Debit"],
      [orderIds[6], "TXN-1007", 79.8, "Pending", "Debit"],
    ];

    for (const pay of payments) {
      await client.query(
        `INSERT INTO payments (order_id, transaction_id, amount, status, method)
     VALUES ($1, $2, $3, $4, $5)`,
        pay,
      );
    }

    console.log(`✅ Inserted ${payments.length} payments`);

    // Order Items - use orderIds and productIds for references
    const orderItems = [
      // Order 1: 2 Chocolate Chip Batch Boxes = $39.90
      [orderIds[0], productIds[0], 2, 19.95],

      // Order 2: 1 White Chocolate Macadamia Nut Batch Box = $21.95
      [orderIds[1], productIds[4], 1, 21.95],

      // Order 3: 1 Peanut Butter Batch Box = $19.95
      [orderIds[2], productIds[2], 1, 19.95],

      // Order 4: 3 different Batch Boxes = $59.85
      [orderIds[3], productIds[0], 1, 19.95],
      [orderIds[3], productIds[1], 1, 19.95],
      [orderIds[3], productIds[2], 1, 19.95],

      // Order 5: Chocolate Chip + White Chocolate Macadamia = $41.90
      [orderIds[4], productIds[0], 1, 19.95],
      [orderIds[4], productIds[4], 1, 21.95],

      // Order 6: 2 Oatmeal Raisin Batch Boxes = $39.90
      [orderIds[5], productIds[3], 2, 19.95],

      // Order 7: 4 Double Chocolate Chip Batch Boxes = $79.80
      [orderIds[6], productIds[1], 4, 19.95],
    ];

    for (const orderItem of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase)
     VALUES ($1, $2, $3, $4)`,
        orderItem,
      );
    }

    console.log(`✅ Inserted ${orderItems.length} order items`);

    // Reviews - use userIds and productIds for references
    const reviews = [
      [
        userIds[0],
        productIds[0],
        5,
        "The chocolate chip cookies were soft, fresh, and packed with chocolate. Definitely ordering again.",
      ],
      [
        userIds[1],
        productIds[4],
        5,
        "The white chocolate macadamia cookies were excellent. Great balance of white chocolate and macadamia nuts.",
      ],
      [
        userIds[2],
        productIds[2],
        4,
        "Really good peanut butter flavor and a nice soft texture. I would order these again.",
      ],
      [
        userIds[3],
        productIds[1],
        5,
        "Rich chocolate flavor without being overly sweet. The double chocolate chip cookies were a favorite.",
      ],
      [
        userIds[4],
        productIds[0],
        4,
        "Fresh and flavorful chocolate chip cookies. The batch box was a good size for sharing.",
      ],
      [
        userIds[5],
        productIds[3],
        5,
        "The oatmeal raisin cookies tasted homemade and had just the right amount of cinnamon and raisins.",
      ],
      [
        userIds[6],
        productIds[1],
        4,
        "Very chocolatey and soft in the center. These went quickly at our family gathering.",
      ],
      [
        userIds[0],
        productIds[3],
        5,
        "I wasn't sure I would like the oatmeal raisin as much as the chocolate chip, but these were excellent.",
      ],
    ];

    const reviewIds = [];

    for (const review of reviews) {
      const { rows } = await client.query(
        `INSERT INTO reviews (user_id, product_id, rating, review)
     VALUES ($1, $2, $3, $4)
     RETURNING review_id`,
        review,
      );

      reviewIds.push(rows[0].review_id);
    }

    console.log(`✅ Inserted ${reviewIds.length} reviews`);

    // Review comments - use reviewIds and userIds for references
    const comments = [
      [
        reviewIds[0],
        userIds[1],
        "I agree. The chocolate chip cookies were one of my favorites too.",
      ],
      [
        reviewIds[0],
        userIds[2],
        "Good to know. I was thinking about trying this batch box next.",
      ],
      [
        reviewIds[1],
        userIds[3],
        "The white chocolate macadamia cookies sound great. I'll have to try them.",
      ],
      [
        reviewIds[2],
        userIds[4],
        "I really liked the peanut butter flavor too.",
      ],
      [
        reviewIds[3],
        userIds[5],
        "The double chocolate chip cookies are definitely a good choice for chocolate lovers.",
      ],
      [
        reviewIds[5],
        userIds[0],
        "The oatmeal raisin cookies surprised me too. Really good flavor.",
      ],
      [
        reviewIds[6],
        userIds[2],
        "These would be great for a party or family gathering.",
      ],
      [
        reviewIds[7],
        userIds[5],
        "I had the same experience. The oatmeal raisin cookies were excellent.",
      ],
    ];

    for (const comment of comments) {
      await client.query(
        `INSERT INTO comments (review_id, user_id, comment)
     VALUES ($1, $2, $3)`,
        comment,
      );
    }

    console.log(`✅ Inserted ${comments.length} review comments`);

    await client.query("COMMIT");
    console.log("🌱 Seed successful!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error);
  } finally {
    client.release(); // Return the database connection back to the pool.
    await db.end(); // Close the database pool after seeding is complete.
    console.log("🔌 Disconnected from DB");
  }
}

seed();
