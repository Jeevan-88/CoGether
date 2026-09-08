const AmazonAdapter = require('../adapters/AmazonAdapter');
const MyntraAdapter = require('../adapters/MyntraAdapter');
const FlipkartAdapter = require('../adapters/FlipkartAdapter');
const AjioAdapter = require('../adapters/AjioAdapter');
const { validateAndNormalizeProduct } = require('./normalization');
const { deduplicateAndGroupOffers } = require('./deduplication');

class SearchIndex {
  constructor() {
    this.adapters = {
      amazon: new AmazonAdapter(),
      myntra: new MyntraAdapter(),
      flipkart: new FlipkartAdapter(),
      ajio: new AjioAdapter()
    };

    this.rawCatalog = [];
    this.indexedProducts = [];
    this.initCatalog();
  }

  initCatalog() {
    // Ingest structured partner catalog spanning major Indian commerce categories
    const feedItems = [
      // ── FOOTWEAR & RUNNING SHOES ──
      {
        id: 'nike_air_max_excee',
        title: 'Nike Air Max Excee Running & Lifestyle Shoes',
        brand: 'Nike',
        category: 'Footwear',
        subcategory: 'Running Shoes',
        description: 'Iconic visual Air unit with breathable mesh overlays and durable foam midsole for supreme athletic cushioning.',
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11'],
        colorOptions: ['Black', 'White/Red', 'Triple Black'],
        rating: 4.6,
        reviewCount: 1420,
        attributes: { modelId: 'NIKE_AIR_MAX_EXCEE', color: 'black', gender: 'men' },
        offers: [
          { retailerId: 'myntra', retailerName: 'Myntra', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-myntra-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4618004.png?f=webp&w=256', price: 6899, originalPrice: 7995, discount: 14, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Free Delivery', productUrl: 'https://www.myntra.com/shoes/nike/nike-air-max-excee/1209384/buy' },
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 7299, originalPrice: 7995, discount: 9, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Prime Free Delivery', productUrl: 'https://www.amazon.in/dp/B082WJ5K98' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 7149, originalPrice: 7995, discount: 11, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Plus Free Delivery', productUrl: 'https://www.flipkart.com/nike-air-max-excee-running-shoes/p/itm129840' }
        ]
      },
      {
        id: 'puma_deviate_nitro_2',
        title: 'Puma Deviate Nitro 2 Carbon-Plated Road Running Shoes',
        brand: 'Puma',
        category: 'Footwear',
        subcategory: 'Running Shoes',
        description: 'Elite marathon shoe featuring dual-layer NITRO Elite foam and full-length carbon composite INNOPLATE.',
        images: [
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['UK 8', 'UK 9', 'UK 10'],
        colorOptions: ['Neon Sun', 'Black Fire'],
        rating: 4.7,
        reviewCount: 520,
        attributes: { modelId: 'PUMA_DEVIATE_NITRO_2', color: 'orange', gender: 'unisex' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 8999, originalPrice: 15999, discount: 44, availability: 'In Stock', deliveryEstimate: '1 Day', shippingInfo: 'Prime One-Day Delivery', productUrl: 'https://www.amazon.in/dp/B09XYZ1234' },
          { retailerId: 'myntra', retailerName: 'Myntra', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-myntra-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4618004.png?f=webp&w=256', price: 9499, originalPrice: 15999, discount: 41, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Free Delivery', productUrl: 'https://www.myntra.com/shoes/puma/puma-deviate-nitro/987123/buy' }
        ]
      },
      {
        id: 'reebok_stride_runner_black',
        title: 'Reebok Stride Extreme Breathable Running Shoes',
        brand: 'Reebok',
        category: 'Footwear',
        subcategory: 'Running Shoes',
        description: 'Comfortable lightweight athletic trainers with high-traction EVA sole, engineered for everyday jogging under ₹3000.',
        images: [
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['UK 7', 'UK 8', 'UK 9', 'UK 10'],
        colorOptions: ['Black', 'Dark Grey'],
        rating: 4.3,
        reviewCount: 880,
        attributes: { modelId: 'REEBOK_STRIDE_RUNNER', color: 'black', gender: 'men' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 2199, originalPrice: 3999, discount: 45, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Prime Free Delivery', productUrl: 'https://www.amazon.in/dp/B07ZREEBOK' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 2399, originalPrice: 3999, discount: 40, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Standard Delivery', productUrl: 'https://www.flipkart.com/reebok-stride-runner/p/itmreebok01' },
          { retailerId: 'ajio', retailerName: 'AJIO', retailerLogo: 'https://assets.ajio.com/static/img/Ajio-Logo.svg', price: 2249, originalPrice: 3999, discount: 44, availability: 'In Stock', deliveryEstimate: '4 Days', shippingInfo: 'Free Delivery', productUrl: 'https://www.ajio.com/p/reebok-stride-401' }
        ]
      },
      {
        id: 'campus_north_plus_black',
        title: 'Campus North Plus Memory Foam Running Shoes',
        brand: 'Campus',
        category: 'Footwear',
        subcategory: 'Running Shoes',
        description: 'Budget-friendly ultra-cushioned running shoes with adaptive memory foam insole and responsive rebound.',
        images: [
          'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'],
        colorOptions: ['All Black', 'Black/Blue'],
        rating: 4.4,
        reviewCount: 3120,
        attributes: { modelId: 'CAMPUS_NORTH_PLUS', color: 'black', gender: 'men' },
        offers: [
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 1499, originalPrice: 2299, discount: 35, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Plus Free Delivery', productUrl: 'https://www.flipkart.com/campus-north-running/p/itm09123' },
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 1599, originalPrice: 2299, discount: 30, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Prime Delivery', productUrl: 'https://www.amazon.in/dp/B08CAMPUS1' }
        ]
      },

      // ── TECH, LAPTOPS & ELECTRONICS ──
      {
        id: 'apple_macbook_air_m2',
        title: 'Apple MacBook Air 13.6-inch M2 Chip (8GB Unified Memory, 256GB SSD)',
        brand: 'Apple',
        category: 'Laptops',
        subcategory: 'Ultrabooks',
        description: 'Strikingly thin design with M2 chip, 18-hour battery life, 13.6-inch Liquid Retina display, 1080p FaceTime HD camera, and MagSafe 3.',
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['256GB SSD', '512GB SSD'],
        colorOptions: ['Midnight', 'Starlight', 'Space Grey', 'Silver'],
        rating: 4.8,
        reviewCount: 2980,
        attributes: { modelId: 'APPLE_MACBOOK_AIR_M2_256', ram: '8GB', storage: '256GB', processor: 'Apple M2' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 83990, originalPrice: 99900, discount: 16, availability: 'In Stock', deliveryEstimate: 'Tomorrow', shippingInfo: 'Prime Free Next-Day', productUrl: 'https://www.amazon.in/dp/B0B3CQ31L1' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 84990, originalPrice: 99900, discount: 15, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Flipkart Assured Free Shipping', productUrl: 'https://www.flipkart.com/apple-macbook-air-m2-8gb-256gb/p/itme891238' }
        ]
      },
      {
        id: 'asus_tuf_gaming_a15',
        title: 'ASUS TUF Gaming A15 (AMD Ryzen 7 7735HS, RTX 4060, 16GB DDR5, 512GB SSD, 144Hz)',
        brand: 'ASUS',
        category: 'Laptops',
        subcategory: 'Gaming Laptops',
        description: 'Military-grade certified gaming laptop engineered for hardcore coding and AAA gaming under ₹80,000.',
        images: [
          'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['16GB / 512GB', '16GB / 1TB'],
        colorOptions: ['Mecha Gray'],
        rating: 4.5,
        reviewCount: 910,
        attributes: { modelId: 'ASUS_TUF_A15_4060', ram: '16GB', gpu: 'RTX 4060', purpose: 'coding and gaming' },
        offers: [
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 77990, originalPrice: 94990, discount: 18, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Free Delivery', productUrl: 'https://www.flipkart.com/asus-tuf-gaming-a15/p/itmasustuf01' },
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 78990, originalPrice: 94990, discount: 17, availability: 'In Stock', deliveryEstimate: '1 Day', shippingInfo: 'Prime Next-Day', productUrl: 'https://www.amazon.in/dp/B0BTUFASUS' }
        ]
      },
      {
        id: 'lenovo_ideapad_slim_3',
        title: 'Lenovo IdeaPad Slim 3 12th Gen Intel Core i5 (16GB RAM, 512GB SSD, FHD 15.6")',
        brand: 'Lenovo',
        category: 'Laptops',
        subcategory: 'Thin & Light Laptops',
        description: 'Dependable fast multitasker for student coding, web development, office, and light creation under ₹50,000.',
        images: [
          'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['16GB RAM / 512GB SSD'],
        colorOptions: ['Arctic Grey'],
        rating: 4.4,
        reviewCount: 1650,
        attributes: { modelId: 'LENOVO_SLIM_3_I5', ram: '16GB', storage: '512GB', purpose: 'coding' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 47990, originalPrice: 68990, discount: 30, availability: 'In Stock', deliveryEstimate: 'Tomorrow', shippingInfo: 'Prime Free Delivery', productUrl: 'https://www.amazon.in/dp/B0CLENOVO3' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 48990, originalPrice: 68990, discount: 29, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Standard Delivery', productUrl: 'https://www.flipkart.com/lenovo-ideapad-slim-3/p/itmlenovo02' }
        ]
      },

      // ── AUDIO & HEADPHONES ──
      {
        id: 'sony_wh1000xm5',
        title: 'Sony WH-1000XM5 Wireless Industry Leading Noise Canceling Headphones',
        brand: 'Sony',
        category: 'Audio',
        subcategory: 'Over-Ear Headphones',
        description: 'Auto NC Optimizer, 8 microphones, 30-hour battery life with fast charging, and crystal-clear hands-free calling.',
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['Standard'],
        colorOptions: ['Black', 'Silver'],
        rating: 4.7,
        reviewCount: 3820,
        attributes: { modelId: 'SONY_WH1000XM5', anc: true, battery: '30h', color: 'black' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 26990, originalPrice: 34990, discount: 23, availability: 'In Stock', deliveryEstimate: 'Tomorrow', shippingInfo: 'Prime Free Delivery', productUrl: 'https://www.amazon.in/dp/B09XS7JWHH' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 27990, originalPrice: 34990, discount: 20, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Flipkart Assured', productUrl: 'https://www.flipkart.com/sony-wh-1000xm5/p/itmsonys01' }
        ]
      },
      {
        id: 'boat_rockerz_550_overear',
        title: 'boAt Rockerz 550 Over-Ear Bluetooth Wireless Headphones with 50mm Drivers',
        brand: 'boAt',
        category: 'Audio',
        subcategory: 'Over-Ear Headphones',
        description: 'High-power 50mm dynamic drivers, physical noise isolation, ergonomic plush ear cushions, and 20 hours playback under ₹2000.',
        images: [
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['Standard'],
        colorOptions: ['Army Green', 'Black', 'Red'],
        rating: 4.2,
        reviewCount: 9410,
        attributes: { modelId: 'BOAT_ROCKERZ_550', color: 'black', battery: '20h' },
        offers: [
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 1799, originalPrice: 4999, discount: 64, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Plus Free Delivery', productUrl: 'https://www.flipkart.com/boat-rockerz-550/p/itmboat01' },
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 1899, originalPrice: 4999, discount: 62, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Prime Free Delivery', productUrl: 'https://www.amazon.in/dp/B08BOAT550' }
        ]
      },
      {
        id: 'oneplus_bullets_wireless_z2',
        title: 'OnePlus Bullets Wireless Z2 Bluetooth Neckband with Fast Charge',
        brand: 'OnePlus',
        category: 'Audio',
        subcategory: 'Neckbands',
        description: '12.4mm bass driver, 30 hours battery, 10 minutes quick charge gives 20 hours audio, IP55 sweat resistance under ₹2000.',
        images: [
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['Standard'],
        colorOptions: ['Magico Black', 'Beam Blue'],
        rating: 4.4,
        reviewCount: 14500,
        attributes: { modelId: 'ONEPLUS_BWZ2', color: 'black', battery: '30h' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 1699, originalPrice: 2299, discount: 26, availability: 'In Stock', deliveryEstimate: '1 Day', shippingInfo: 'Prime Delivery', productUrl: 'https://www.amazon.in/dp/B09V44G3F6' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 1749, originalPrice: 2299, discount: 24, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Free Delivery', productUrl: 'https://www.flipkart.com/oneplus-bullets-wireless-z2/p/itmoneplus02' }
        ]
      },

      // ── GAMING PERIPHERALS ──
      {
        id: 'logitech_g502_hero',
        title: 'Logitech G502 Hero High Performance Wired Gaming Mouse (25K Sensor, 11 Buttons)',
        brand: 'Logitech',
        category: 'Gaming',
        subcategory: 'Gaming Mice',
        description: 'Hero 25K optical sensor with sub-micron precision, adjustable weights, 11 programmable buttons, and onboard profiles.',
        images: [
          'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['Standard'],
        colorOptions: ['Black'],
        rating: 4.7,
        reviewCount: 7120,
        attributes: { modelId: 'LOGITECH_G502_HERO', dpi: '25,600', buttons: 11, color: 'black' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 3895, originalPrice: 5495, discount: 29, availability: 'In Stock', deliveryEstimate: 'Tomorrow', shippingInfo: 'Prime Next-Day', productUrl: 'https://www.amazon.in/dp/B07GBZ4Q68' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 3999, originalPrice: 5495, discount: 27, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Standard Delivery', productUrl: 'https://www.flipkart.com/logitech-g502-hero/p/itmlogig01' }
        ]
      },
      {
        id: 'redragon_m601_centrophorus',
        title: 'Redragon M601 RGB Backlit Wired Ergonomic Gaming Mouse under ₹2000',
        brand: 'Redragon',
        category: 'Gaming',
        subcategory: 'Gaming Mice',
        description: 'Ergonomic ambidextrous gaming mouse with 3200 DPI sensor, 6 programmable buttons, and 8-piece weight tuning set.',
        images: [
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['Standard'],
        colorOptions: ['Black/Red RGB'],
        rating: 4.3,
        reviewCount: 4200,
        attributes: { modelId: 'REDRAGON_M601', dpi: '3200', color: 'black' },
        offers: [
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 999, originalPrice: 1999, discount: 50, availability: 'In Stock', deliveryEstimate: '1 Day', shippingInfo: 'Prime Free Delivery', productUrl: 'https://www.amazon.in/dp/B00HTK1NCS' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 1049, originalPrice: 1999, discount: 47, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Standard Delivery', productUrl: 'https://www.flipkart.com/redragon-m601/p/itmredragon01' }
        ]
      },

      // ── FASHION, SHIRTS & APPAREL ──
      {
        id: 'levis_mens_511_slim_fit_jeans',
        title: "Levi's Men's 511 Slim Fit Stretch Dark Indigo Denim Jeans",
        brand: "Levi's",
        category: 'Fashion',
        subcategory: 'Jeans',
        description: 'Modern slim fit with room to move, crafted with Levi’s Flex advanced stretch technology for maximum comfort.',
        images: [
          'https://images.unsplash.com/photo-1542272604-780c96856592?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['30', '32', '34', '36'],
        colorOptions: ['Dark Indigo', 'Black Stonewash'],
        rating: 4.5,
        reviewCount: 2100,
        attributes: { modelId: 'LEVIS_511_SLIM', color: 'blue', gender: 'men' },
        offers: [
          { retailerId: 'myntra', retailerName: 'Myntra', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-myntra-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4618004.png?f=webp&w=256', price: 1899, originalPrice: 3599, discount: 47, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Free Delivery', productUrl: 'https://www.myntra.com/jeans/levis/levis-511-slim/489123/buy' },
          { retailerId: 'ajio', retailerName: 'AJIO', retailerLogo: 'https://assets.ajio.com/static/img/Ajio-Logo.svg', price: 1949, originalPrice: 3599, discount: 46, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Free Delivery', productUrl: 'https://www.ajio.com/p/levis-511-denim-01' },
          { retailerId: 'amazon', retailerName: 'Amazon India', retailerLogo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg', price: 2099, originalPrice: 3599, discount: 42, availability: 'In Stock', deliveryEstimate: '2 Days', shippingInfo: 'Prime Free Delivery', productUrl: 'https://www.amazon.in/dp/B07LEVIS511' }
        ]
      },
      {
        id: 'roadster_casual_black_cotton_shirt',
        title: 'Roadster Men Pure Cotton Casual Spread Collar Black Shirt',
        brand: 'Roadster',
        category: 'Fashion',
        subcategory: 'Shirts',
        description: 'Sleek premium 100% combed cotton casual shirt with curved hem, modern spread collar, and chest pocket under ₹1,500.',
        images: [
          'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80'
        ],
        sizeOptions: ['S', 'M', 'L', 'XL'],
        colorOptions: ['Pure Black', 'Navy Blue', 'Olive Green'],
        rating: 4.3,
        reviewCount: 3950,
        attributes: { modelId: 'ROADSTER_BLACK_SHIRT_01', color: 'black', gender: 'men' },
        offers: [
          { retailerId: 'myntra', retailerName: 'Myntra', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-myntra-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4618004.png?f=webp&w=256', price: 849, originalPrice: 1999, discount: 57, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Free Delivery on First Order', productUrl: 'https://www.myntra.com/shirts/roadster/roadster-black-shirt/109283/buy' },
          { retailerId: 'flipkart', retailerName: 'Flipkart', retailerLogo: 'https://cdn.iconscout.com/icon/free/png-256/free-flipkart-logo-icon-download-in-svg-png-gif-file-formats--shopping-brand-social-media-pack-logos-icons-4617992.png?f=webp&w=256', price: 899, originalPrice: 1999, discount: 55, availability: 'In Stock', deliveryEstimate: '3 Days', shippingInfo: 'Standard Delivery', productUrl: 'https://www.flipkart.com/roadster-cotton-shirt/p/itmroadster01' }
        ]
      }
    ];

    // Normalize and deduplicate
    const normalized = feedItems.map((item) => validateAndNormalizeProduct(item));
    this.indexedProducts = deduplicateAndGroupOffers(normalized);
  }

  /**
   * Natural query interpreter: extracts brand, budget, category, and color
   */
  parseNaturalQuery(rawQuery = '') {
    const q = rawQuery.toLowerCase().trim();
    let maxPrice = null;
    let minPrice = null;
    let detectedBrand = null;
    let detectedCategory = null;
    let detectedColor = null;

    // Price extraction: "under 3000", "below 80000", "less than 2000", "under ₹5,000"
    const underMatch = q.match(/(?:under|below|less than|within|upto)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
    if (underMatch) {
      maxPrice = parseInt(underMatch[1].replace(/,/g, ''), 10);
    }

    const aboveMatch = q.match(/(?:above|more than|from)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
    if (aboveMatch) {
      minPrice = parseInt(aboveMatch[1].replace(/,/g, ''), 10);
    }

    // Brands
    const knownBrands = ['nike', 'puma', 'reebok', 'campus', 'apple', 'asus', 'lenovo', 'sony', 'boat', 'oneplus', 'logitech', 'redragon', 'levis', "levi's", 'roadster'];
    for (const b of knownBrands) {
      if (q.includes(b)) {
        detectedBrand = b === "levis" ? "Levi's" : b.charAt(0).toUpperCase() + b.slice(1);
        break;
      }
    }

    // Categories
    if (q.includes('shoe') || q.includes('runner') || q.includes('sneaker')) detectedCategory = 'Footwear';
    else if (q.includes('laptop') || q.includes('macbook') || q.includes('notebook')) detectedCategory = 'Laptops';
    else if (q.includes('headphone') || q.includes('earphone') || q.includes('neckband') || q.includes('audio')) detectedCategory = 'Audio';
    else if (q.includes('mouse') || q.includes('keyboard') || q.includes('gaming')) detectedCategory = 'Gaming';
    else if (q.includes('shirt') || q.includes('jeans') || q.includes('dress') || q.includes('wear')) detectedCategory = 'Fashion';

    // Color
    const knownColors = ['black', 'white', 'blue', 'red', 'green', 'orange', 'silver', 'grey', 'gray'];
    for (const c of knownColors) {
      if (q.includes(c)) {
        detectedColor = c;
        break;
      }
    }

    // Strip conversational stop words: "find", "show", "need", "best", etc.
    const stopWords = new Set(['find', 'show', 'search', 'get', 'need', 'looking', 'look', 'want', 'buy', 'me', 'a', 'an', 'the', 'for', 'with', 'in', 'i', 'good', 'best', 'some', 'please']);
    const cleanTokens = q
      .replace(/(under|below|less than|within|upto|above|more than|from)\s*(?:₹|rs\.?|inr)?\s*[\d,]+/gi, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && !stopWords.has(t));

    return {
      cleanQuery: cleanTokens.join(' ').trim(),
      maxPrice,
      minPrice,
      detectedBrand,
      detectedCategory,
      detectedColor
    };
  }

  /**
   * Search index with multi-facet filtering, sorting, and pagination
   */
  search(params = {}) {
    const {
      q = '',
      category = 'all',
      retailer = 'all',
      brand = 'all',
      minPrice = 0,
      maxPrice = 1000000,
      minRating = 0,
      sort = 'relevance',
      limit = 20,
      offset = 0
    } = params;

    const parsed = this.parseNaturalQuery(q);
    const effectiveMaxPrice = parsed.maxPrice !== null ? Math.min(Number(maxPrice), parsed.maxPrice) : Number(maxPrice);
    const effectiveMinPrice = parsed.minPrice !== null ? Math.max(Number(minPrice), parsed.minPrice) : Number(minPrice);
    const effectiveCategory = category !== 'all' ? category : (parsed.detectedCategory || 'all');
    const effectiveBrand = brand !== 'all' ? brand : (parsed.detectedBrand || 'all');

    let results = this.indexedProducts.filter((product) => {
      // 1. Text match
      if (parsed.cleanQuery) {
        const textTokens = parsed.cleanQuery.split(/\s+/).filter(Boolean);
        const searchCorpus = `${product.title} ${product.brand} ${product.description} ${product.category} ${product.subcategory}`.toLowerCase();
        const matchesText = textTokens.every((token) => searchCorpus.includes(token));
        if (!matchesText) return false;
      }

      // 2. Category filter
      if (effectiveCategory !== 'all' && product.category.toLowerCase() !== effectiveCategory.toLowerCase()) {
        return false;
      }

      // 3. Brand filter
      if (effectiveBrand !== 'all' && product.brand.toLowerCase() !== effectiveBrand.toLowerCase()) {
        return false;
      }

      // 4. Retailer filter
      if (retailer !== 'all') {
        const selectedRetailers = retailer.split(',').map((r) => r.trim().toLowerCase());
        const hasMatchingOffer = product.offers.some((o) => selectedRetailers.includes(o.retailerId.toLowerCase()));
        if (!hasMatchingOffer) return false;
      }

      // 5. Price filter
      if (product.price < effectiveMinPrice || product.price > effectiveMaxPrice) {
        return false;
      }

      // 6. Rating filter
      if (product.rating < Number(minRating)) {
        return false;
      }

      // 7. Color filter (if detected)
      if (parsed.detectedColor) {
        const colorMatch = (product.attributes?.color || '').toLowerCase().includes(parsed.detectedColor) ||
          (product.colorOptions || []).some((c) => c.toLowerCase().includes(parsed.detectedColor)) ||
          product.title.toLowerCase().includes(parsed.detectedColor);
        if (!colorMatch) return false;
      }

      return true;
    });

    // Compute dynamic facet counts from filtered candidates
    const facets = this.computeFacets(results);

    // Sorting
    results.sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'best_value') {
        // Best Value algorithm: weighted score based on rating, discount, and review volume
        const scoreA = (a.rating * 20) + (a.discount * 0.5) + (Math.log10(a.reviewCount + 1) * 5) - (a.price * 0.0001);
        const scoreB = (b.rating * 20) + (b.discount * 0.5) + (Math.log10(b.reviewCount + 1) * 5) - (b.price * 0.0001);
        return scoreB - scoreA;
      }
      if (sort === 'newest') return b.sourceTimestamp - a.sourceTimestamp;
      return 0; // relevance / default
    });

    const total = results.length;
    const paginated = results.slice(Number(offset), Number(offset) + Number(limit));

    return {
      total,
      limit: Number(limit),
      offset: Number(offset),
      parsedQuery: parsed,
      facets,
      products: paginated
    };
  }

  computeFacets(items) {
    const brandsMap = {};
    const categoriesMap = {};
    const retailersMap = { amazon: 0, myntra: 0, flipkart: 0, ajio: 0 };
    let minPrice = Infinity;
    let maxPrice = 0;

    for (const item of items) {
      // Brands
      brandsMap[item.brand] = (brandsMap[item.brand] || 0) + 1;
      // Categories
      categoriesMap[item.category] = (categoriesMap[item.category] || 0) + 1;
      // Retailers
      for (const off of item.offers || []) {
        if (retailersMap[off.retailerId] !== undefined) {
          retailersMap[off.retailerId]++;
        }
      }
      if (item.price < minPrice) minPrice = item.price;
      if (item.price > maxPrice) maxPrice = item.price;
    }

    return {
      brands: Object.entries(brandsMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      categories: Object.entries(categoriesMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      retailers: Object.entries(retailersMap).map(([id, count]) => ({ id, count })),
      priceRange: {
        min: minPrice === Infinity ? 0 : minPrice,
        max: maxPrice === 0 ? 100000 : maxPrice
      }
    };
  }

  getProductById(id) {
    return this.indexedProducts.find((p) => p.id === id) || null;
  }
}

module.exports = SearchIndex;
