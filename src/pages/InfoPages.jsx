import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  ExternalLink,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { Notice } from "../components/Common.jsx";
import {
  getStoreReviews,
  getStoreSettings,
} from "../services/catalog.js";

const supportPhone = "+233547767018";
const supportDisplay = "054 776 7018";
const alternateSupportPhone = "+233592720844";
const alternateSupportDisplay = "059 272 0844";
const supportEmail = "kelvinasante920@gmail.com";
const shopAddress =
  "Ashaley Botwe, School Junction, Malejor Curve, Accra, Ghana";
const mapSearch = encodeURIComponent(shopAddress);
const supportWhatsApp = `https://wa.me/${supportPhone.slice(1)}`;

function PageHeading({ eyebrow, title, detail }) {
  return (
    <header className="public-page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {detail && <p>{detail}</p>}
    </header>
  );
}

function PublicPage({ children, className = "" }) {
  return (
    <section className={`public-info-page shell page-space ${className}`}>
      {children}
    </section>
  );
}

function PolicyPageLayout({ title, intro, children, ownerNote }) {
  return (
    <PublicPage className="policy-page">
      <PageHeading
        eyebrow="CUSTOMER INFORMATION"
        title={title}
        detail={intro}
      />
      {ownerNote && (
        <div className="policy-owner-note">
          <b>Store details to confirm</b>
          <p>{ownerNote}</p>
        </div>
      )}
      <div className="policy-content">{children}</div>
      <p className="policy-review-note">
        This information describes the store’s stated procedures and is not
        legal advice. Please review it with an appropriate adviser before
        relying on it as a final legal policy.
      </p>
    </PublicPage>
  );
}

function PolicySection({ title, children }) {
  return (
    <section className="policy-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function AboutPage() {
  const [aboutExpanded, setAboutExpanded] = useState(false);

  return (
    <PublicPage className="about-page">
      <section className="about-hero">
        <div
          className="about-visual"
          aria-label="AB Beauty Conner beauty and hair products"
        >
          <div className="about-visual-main">
            <img
              src="/images/hero_wig.jpeg"
              alt="Wigs displayed at AB Beauty Conner"
            />
          </div>
          <div className="about-visual-secondary">
            <img
              src="/images/ab.jpg"
              alt="AB Beauty Conner skincare campaign"
            />
          </div>
          <div className="about-visual-note">
            <Heart size={16} fill="currentColor" />
            <span>
              <b>Beauty in every detail</b>
              <small>Style that feels like you</small>
            </span>
          </div>
        </div>
        <div className="about-copy">
          <span className="eyebrow">A BIT ABOUT US</span>
          <h1>
            Let your beauty Speak
          </h1>
          <div
            className={`about-story-text ${aboutExpanded ? "is-expanded" : ""}`}
          >
            <p>
              At <b>AB Beauty Conner</b>, we believe that beauty is more than
              just appearance — it is about confidence, self-expression, and
              feeling your best every day. Our mission is to make beauty,
              fashion, and lifestyle essentials accessible to everyone by
              offering quality products that help you look good, feel
              confident, and express your unique style.
            </p>
            <p>
              We offer a carefully selected range of products, including{" "}
              <b>
                wigs, perfumes, skincare products, creams and lotions, facial
                care products, clothing, shoes, bags, watches, and other fashion
                accessories
              </b>{" "}
              for both ladies and gentlemen.
            </p>
            <p>
              Our commitment is to provide a convenient and enjoyable shopping
              experience, with quality products, friendly customer service, and
              reliable delivery. Whether you are refreshing your wardrobe,
              searching for your signature fragrance, upgrading your beauty
              routine, or looking for the perfect accessory, AB Beauty Conner
              is here to help you find what you love.
            </p>
            <p>
              We understand that every customer is unique, which is why we
              strive to offer products that suit different tastes, styles, and
              needs. With a passion for beauty and fashion, we aim to make
              online shopping simple, enjoyable, and trustworthy.
            </p>
          </div>
          <button
            className="about-read-more"
            type="button"
            aria-expanded={aboutExpanded}
            onClick={() => setAboutExpanded((expanded) => !expanded)}
          >
            {aboutExpanded ? "Read less" : "Read more"}
          </button>
        </div>
      </section>
      <section className="about-purpose-grid">
        <article className="about-purpose-card">
          <span className="eyebrow">WHAT DRIVES US</span>
          <h2>Our Mission</h2>
          <p>
            To empower our customers with quality beauty and fashion products
            that inspire confidence, celebrate individuality, and make
            everyday living more stylish.
          </p>
        </article>
        <article className="about-purpose-card about-purpose-vision">
          <span className="eyebrow">WHERE WE’RE GOING</span>
          <h2>Our Vision</h2>
          <p>
            To become a trusted and preferred destination for beauty, fashion,
            and lifestyle essentials in Ghana and beyond.
          </p>
        </article>
      </section>
      <section className="about-benefits">
        <header className="about-section-heading">
          <span className="eyebrow">THE AB BEAUTY CONNER DIFFERENCE</span>
          <h2>Why Choose AB Beauty Conner?</h2>
        </header>
        <div className="about-benefit-grid">
          <article className="about-benefit-card">
            <span>
              <BadgeCheck />
            </span>
            <h3>Quality Products</h3>
            <p>Carefully selected beauty and fashion essentials.</p>
          </article>
          <article className="about-benefit-card">
            <span>
              <ShoppingBag />
            </span>
            <h3>Variety</h3>
            <p>A wide range of products for different styles and needs.</p>
          </article>
          <article className="about-benefit-card">
            <span>
              <Heart />
            </span>
            <h3>Convenient Shopping</h3>
            <p>Shop your favourites online from the comfort of your home.</p>
          </article>
          <article className="about-benefit-card">
            <span>
              <Truck />
            </span>
            <h3>Reliable Delivery</h3>
            <p>We work to get your orders to you safely and on time.</p>
          </article>
          <article className="about-benefit-card">
            <span>
              <Star />
            </span>
            <h3>Customer Satisfaction</h3>
            <p>Your shopping experience and happiness matter to us.</p>
          </article>
        </div>
      </section>
      <section className="about-closing">
        <span className="eyebrow">AB BEAUTY CONNER</span>
        <p>
          Thank you for choosing us. We look forward to being part of your
          beauty and style journey!
        </p>
        <Link className="button button-dark" to="/shop">
          Shop now <ArrowRight size={16} />
        </Link>
      </section>
    </PublicPage>
  );
}

export function ContactPage() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getStoreSettings()
      .then((value) => active && setSettings(value))
      .catch((reason) => active && setError(reason.message));
    return () => {
      active = false;
    };
  }, []);

  const phone = settings?.phone?.trim() || supportDisplay;
  const phoneHref = phone.replace(/[^\d+]/g, "");
  function submitContactForm(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const subject = String(formData.get("subject") || "").trim();
    const message = String(formData.get("message") || "").trim();
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const params = new URLSearchParams({ subject, body });
    window.location.href = `mailto:${supportEmail}?${params.toString()}`;
  }

  return (
    <PublicPage>
      <PageHeading
        eyebrow="WE’RE HERE TO HELP"
        title="Contact AB Beauty Conner"
        detail="Questions about an order, delivery, a product, or a return? Contact us using one of the verified channels below."
      />
      <Notice message={error} />
      <div className="contact-methods">
        <a className="contact-method-card" href={`tel:${phoneHref}`}>
          <span className="public-info-icon">
            <Phone />
          </span>
          <span>
            <b>Call us</b>
            <small>{phone}</small>
          </span>
          <ArrowRight size={17} />
        </a>
        <a
          className="contact-method-card"
          href={`tel:${alternateSupportPhone}`}
        >
          <span className="public-info-icon">
            <Phone />
          </span>
          <span>
            <b>Call us</b>
            <small>{alternateSupportDisplay}</small>
          </span>
          <ArrowRight size={17} />
        </a>
        <a
          className="contact-method-card"
          href={supportWhatsApp}
          target="_blank"
          rel="noreferrer"
        >
          <span className="public-info-icon">
            <MessageCircle />
          </span>
          <span>
            <b>WhatsApp</b>
            <small>{supportDisplay}</small>
          </span>
          <ExternalLink size={16} />
        </a>
        <a className="contact-method-card" href={`mailto:${supportEmail}`}>
          <span className="public-info-icon">
            <Mail />
          </span>
          <span>
            <b>Email</b>
            <small>{supportEmail}</small>
          </span>
          <ArrowRight size={17} />
        </a>
        <div className="contact-method-card">
          <span className="public-info-icon">
            <MapPin />
          </span>
          <span>
            <b>Visit our shop</b>
            <small>{shopAddress}</small>
          </span>
          <ExternalLink size={16} />
        </div>
      </div>
      <section className="contact-location">
        <div className="contact-location-heading">
          <div>
            <span className="eyebrow">FIND OUR SHOP</span>
            <h2>Ashaley Botwe School Junction</h2>
            <p>{shopAddress}</p>
          </div>
          <a
            className="button button-outline"
            href={`https://www.google.com/maps/search/?api=1&query=${mapSearch}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin size={16} /> Get directions
          </a>
        </div>
        <iframe
          className="contact-location-map"
          title="Map showing AB Beauty Conner at Ashaley Botwe School Junction, Accra"
          src={`https://www.google.com/maps?q=${mapSearch}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
      <form className="contact-form" onSubmit={submitContactForm}>
        <div>
          <span className="eyebrow">SEND A MESSAGE</span>
          <h2>Email our team</h2>
        </div>
        <div className="contact-form-grid">
          <label>
            Your name
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            Your email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="contact-form-subject">
            Subject
            <input name="subject" required />
          </label>
          <label className="contact-form-message">
            Message
            <textarea name="message" rows="5" required />
          </label>
        </div>
        <button className="button button-dark" type="submit">
          <Mail size={16} /> Continue to email
        </button>
      </form>
      <p className="contact-help-note">
        For a product or order question, include the product name or order
        number. Do not send your password or full payment card details.
      </p>
    </PublicPage>
  );
}

const faqItems = [
  {
    question: "How do I place an order?",
    answer:
      "Browse active products, add available items to your bag, review quantities and delivery charges, then enter delivery details and complete payment through Paystack.",
  },
  {
    question: "Which payment methods are available?",
    answer:
      "Checkout currently uses Paystack for online payment. Available payment channels, including card and supported mobile money options, are shown by Paystack during payment.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Estimated delivery is 2–5 working days, depending on the destination and order confirmation. Delivery may take longer due to location, courier availability, weather, or other unforeseen circumstances. Contact us if your order is delayed.",
  },
  {
    question: "Where do you deliver, and what are the delivery charges?",
    answer:
      "We deliver across Ghana. Fees are Accra GH₵40, Tema Communities 1–25 GH₵50, Kumasi GH₵50, Sunyani GH₵60, and Tamale GH₵70. For other destinations, contact us to confirm the applicable fee before the order is finalized.",
  },
  {
    question: "Can I return a damaged or incorrect product?",
    answer:
      "Contact us before returning a product. Returns should be unused and undamaged, in original packaging and condition, with accessories and tags where applicable. Damaged, defective, or incorrectly supplied items are assessed under the policy and applicable consumer protections.",
  },
  {
    question: "How can I tell whether an item is in stock?",
    answer:
      "Availability is based on the store’s current inventory. Products with no available quantity are marked sold out, and order quantities are checked again before an order is completed.",
  },
  {
    question: "How do I cancel an order?",
    answer:
      "Contact us as soon as possible with your order number. Cancellation may be accepted before dispatch; once dispatched, cancellation may no longer be possible. See the Order Cancellation Policy.",
  },
  {
    question: "How can I contact customer support?",
    answer: `Call us on ${supportDisplay} or ${alternateSupportDisplay}, or message us on WhatsApp at ${supportDisplay}. The Contact Us page shows all contact options.`,
  },
];

export function FaqPage() {
  return (
    <PublicPage>
      <PageHeading
        eyebrow="CUSTOMER CARE"
        title="Frequently asked questions"
        detail="Answers about shopping, payments, delivery, stock, and support."
      />
      <div className="faq-list">
        {faqItems.map(({ question, answer }) => (
          <details className="faq-item" key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <p className="public-page-cta">
        Need more help? <Link to="/contact">Contact our support team</Link>.
      </p>
    </PublicPage>
  );
}

export function CustomerReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getStoreReviews()
      .then((items) => active && setReviews(items))
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <PublicPage>
      <PageHeading
        eyebrow="CUSTOMER REVIEWS"
        title="Notes from our customers"
        detail="Only reviews approved by the store are shown. Reviews are associated with product purchases delivered through the store."
      />
      <Notice message={error} />
      {loading ? (
        <div className="public-info-card">Loading approved reviews…</div>
      ) : reviews.length ? (
        <div className="public-reviews-grid">
          {reviews.map((review) => (
            <article className="public-review-card" key={review.id}>
              <div
                className="public-review-stars"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={16}
                    fill={index < review.rating ? "currentColor" : "none"}
                  />
                ))}
              </div>
              <p>{review.review || "A customer left a product rating."}</p>
              <div className="public-review-meta">
                <span>Verified store review</span>
                <time dateTime={review.created_at}>
                  {new Date(review.created_at).toLocaleDateString()}
                </time>
              </div>
              {review.products?.slug && (
                <Link
                  className="text-link"
                  to={`/product/${review.products.slug}`}
                >
                  {review.products.name} <ArrowRight size={14} />
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="public-info-card">
          <h2>No approved reviews yet</h2>
          <p>
            Customer reviews will appear here after they are submitted for an
            eligible delivered order and approved by the store.
          </p>
        </div>
      )}
      <p className="public-page-cta">
        <Clock3 size={16} /> Reviews shown here are published after store
        moderation.
      </p>
    </PublicPage>
  );
}

export function PolicyPage() {
  const { slug } = useParams();
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getStoreSettings()
      .then((value) => active && setSettings(value))
      .catch((reason) => active && setError(reason.message));
    return () => {
      active = false;
    };
  }, []);

  const contactEmail = settings?.contact_email;
  const support = <Link to="/contact">Contact AB Beauty Conner support</Link>;
  const policyPages = {
    terms: {
      title: "Terms and Conditions",
      intro:
        "These terms explain how orders are placed and fulfilled through the AB Beauty Conner online store.",
      sections: [
        {
          title: "Orders and acceptance",
          content: (
            <p>
              You are responsible for providing accurate contact and delivery
              details. Submitting checkout details is an order request. An order
              is accepted when AB Beauty Conner confirms it; automated payment
              authorization alone does not confirm stock or delivery.
            </p>
          ),
        },
        {
          title: "Products, prices, and stock",
          content: (
            <p>
              Prices are displayed in Ghana cedis (GHS). Product images and
              descriptions are provided to identify the item; minor display
              differences may occur. AB Beauty Conner is a physical retail
              store, and products advertised online are physically stocked at
              the store; the business does not operate a dropshipping model.
              Product availability is rechecked before order completion. If an
              item becomes unavailable, support will contact you about the
              order and any payment made.
            </p>
          ),
        },
        {
          title: "Payment",
          content: (
            <p>
              Online checkout is processed through Paystack. Payment status is
              confirmed with the payment provider before an order is recorded as
              paid. Do not share payment passwords, PINs, or one-time security
              codes with the store.
            </p>
          ),
        },
        {
          title: "Delivery",
          content: (
            <>
              <p>
                AB Beauty Conner delivers across Ghana. Estimated delivery is
                2–5 working days, depending on destination and order
                confirmation. Current fees for selected locations are:
              </p>
              <ul>
                <li>Accra — GH₵40</li>
                <li>Tema (Communities 1–25) — GH₵50</li>
                <li>Kumasi — GH₵50</li>
                <li>Sunyani — GH₵60</li>
                <li>Tamale — GH₵70</li>
              </ul>
              <p>
                For other destinations within Ghana, contact the store to
                confirm the delivery fee before the order is finalized.
                Delivery times may vary due to location, courier availability,
                weather, or other unforeseen circumstances. The applicable fee
                for a listed location is shown in checkout before payment.
              </p>
            </>
          ),
        },
        {
          title: "Customer responsibilities and support",
          content: (
            <p>
              Check item details and delivery information before paying, keep
              your order reference, and provide a reachable phone number.
              Contact us promptly if an order or item has a problem. {support}.
            </p>
          ),
        },
      ],
    },
    privacy: {
      title: "Privacy Policy",
      intro:
        "This notice describes personal information used by the store’s current account, checkout, and shopping features.",
      sections: [
        {
          title: "Information the store processes",
          content: (
            <ul>
              <li>
                Account details such as name, email address, phone number, and
                profile image when provided.
              </li>
              <li>
                Delivery details, order items, quantities, order status, and
                payment reference/status required to fulfil and support an
                order.
              </li>
              <li>
                Cart and wishlist items, and product ratings or reviews you
                submit.
              </li>
              <li>
                Guest cart and wishlist selections stored in your browser’s
                local storage until cleared or associated with an account.
              </li>
            </ul>
          ),
        },
        {
          title: "How information is used",
          content: (
            <p>
              Information is used to create and secure accounts, process orders
              and payments, arrange delivery, manage stock, respond to support
              requests, display approved reviews, and maintain the store.
              Payment processing is provided by Paystack. Do not share your
              payment PIN, password, or one-time security code with the store.
            </p>
          ),
        },
        {
          title: "Service providers and keeping information safe",
          content: (
            <p>
              The store works with service providers to support its website,
              customer accounts, and payments. We take reasonable steps to
              protect the information used to operate the store, but no online
              service can be guaranteed completely secure. Protect your account
              credentials and contact support if you suspect unauthorized use.
            </p>
          ),
        },
        {
          title: "Choices and privacy requests",
          content: (
            <p>
              You can update some account details and saved addresses through
              your account. To request access, correction, or deletion of
              information, contact {support}. Requests may be subject to
              order-record needs and applicable legal requirements, which the
              business should confirm with a qualified adviser.
            </p>
          ),
        },
      ],
    },
    "refund-returns": {
      title: "Refund and Return Policy",
      intro:
        "Return and refund requests are reviewed according to the circumstances of the order, this policy, and applicable consumer protection requirements.",
      ownerNote:
        "The business has not specified a standard return request window or who pays return delivery. Contact support to confirm these details before sending an item back.",
      sections: [
        {
          title: "Return eligibility and condition",
          content: (
            <p>
              For a standard return, the product must be unused and undamaged,
              in its original packaging and original condition, with all
              accessories and tags where applicable. Contact the store before
              returning any product so support can explain the return process.
              Reported damaged, defective, or incorrectly supplied products
              are assessed separately as described below.
            </p>
          ),
        },
        {
          title: "Damaged, defective, or incorrect products",
          content: (
            <p>
              Products reported as damaged, defective, incorrectly supplied,
              or otherwise covered by applicable consumer protection
              requirements will be assessed appropriately. Contact support with
              your order number, a description, and clear photos where relevant.
              Nothing in this policy removes rights available under applicable
              law.
            </p>
          ),
        },
        {
          title: "Refund decisions and delivery fees",
          content: (
            <p>
              Refund requests are reviewed based on the circumstances of the
              order and the applicable return policy. If a refund is approved,
              support will explain the process and expected timeframe. Refunds
              for online payments are processed through the appropriate payment
              channel. Delivery fees are assessed according to the circumstances
              of the return and applicable consumer protection requirements.
            </p>
          ),
        },
        {
          title: "Contact support",
          content: (
            <p>{support} with your order number and supporting details.</p>
          ),
        },
      ],
    },
    "shipping-delivery": {
      title: "Shipping and Delivery Policy",
      intro:
        "AB Beauty Conner is a physical retail store in Accra. Products advertised online are stocked at our store; we do not operate a dropshipping business.",
      sections: [
        {
          title: "Estimated delivery time",
          content: (
            <p>
              We deliver to customers across Ghana, including Accra, Kumasi,
              Sunyani, Tamale, and other regions. Estimated delivery is 2–5
              working days, depending on destination and order confirmation.
              Delivery times may vary due to location, courier availability,
              weather, or other unforeseen circumstances.
            </p>
          ),
        },
        {
          title: "Delivery areas and charges",
          content: (
            <>
              <p>
                Delivery charges for selected locations are:
              </p>
              <ul>
                <li>Accra — GH₵40</li>
                <li>Tema (Communities 1–25) — GH₵50</li>
                <li>Kumasi — GH₵50</li>
                <li>Sunyani — GH₵60</li>
                <li>Tamale — GH₵70</li>
              </ul>
              <p>
                For other destinations within Ghana, contact the store to
                confirm the applicable fee before the order is finalized. The
                fee for a listed location is shown in checkout before payment.
              </p>
            </>
          ),
        },
        {
          title: "Delays or delivery issues",
          content: (
            <p>
              If delivery has not arrived within the estimate, contact support
              with your order number and phone number. The store will check the
              order and available delivery information and advise you of the
              next step.
            </p>
          ),
        },
        {
          title: "Business location",
          content: (
            <p>
              AB Beauty Conner is located at {shopAddress}. {support} about
              delivery to your area.
            </p>
          ),
        },
      ],
    },
    "order-cancellation": {
      title: "Order Cancellation Policy",
      intro:
        "Contact support as quickly as possible if you need to cancel an order.",
      sections: [
        {
          title: "Requesting cancellation",
          content: (
            <p>
              Send your order number and cancellation request to support. The
              store will confirm whether the order has been dispatched.
              Cancellation may be accepted before dispatch, and is not
              confirmed until support responds.
            </p>
          ),
        },
        {
          title: "After dispatch",
          content: (
            <p>
              Once an order has been dispatched, cancellation may no longer be
              possible. Contact support for instructions; the request may need
              to be handled under the Refund and Return Policy instead.
            </p>
          ),
        },
        {
          title: "Payment and eligible refunds",
          content: (
            <p>
              If payment has already been made for an eligible cancelled order,
              support will inform you of the applicable refund arrangements.
              Refund requests are assessed according to the circumstances of
              the order and applicable consumer protection requirements.
            </p>
          ),
        },
        {
          title: "Contact support",
          content: <p>{support} promptly with your order number.</p>,
        },
      ],
    },
  };
  const policy = policyPages[slug];

  return (
    <PolicyPageLayout
      title={policy?.title || "Store policies"}
      intro={
        policy?.intro ||
        "Choose a policy below or contact the store if you need help."
      }
      ownerNote={policy?.ownerNote}
    >
      <Notice message={error} />
      {policy ? (
        policy.sections.map((section) => (
          <PolicySection key={section.title} title={section.title}>
            {section.content}
          </PolicySection>
        ))
      ) : (
        <ul className="policy-link-list">
          {Object.entries(policyPages).map(([slug, item]) => (
            <li key={slug}>
              <Link to={`/policies/${slug}`}>{item.title}</Link>
            </li>
          ))}
        </ul>
      )}
      <div className="policy-related-links">
        <Link to="/faq">FAQs</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/shop">Continue shopping</Link>
        {contactEmail && <a href={`mailto:${contactEmail}`}>{contactEmail}</a>}
      </div>
    </PolicyPageLayout>
  );
}
