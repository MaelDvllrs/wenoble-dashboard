# Wenoble Dashboard

**A custom website management platform built to simplify website creation, content management, and deployment.**

Wenoble Dashboard is a proprietary platform developed for [Wenoble](https://wenoble.fr), a digital acquisition agency helping businesses build and grow their online presence.

The platform centralizes website management in one place, allowing clients to manage their website content while automating key parts of the website generation, hosting, and deployment process.

## Overview

Wenoble Dashboard was designed to streamline the delivery and management of websites at scale, reducing repetitive technical operations and providing a centralized experience for clients and the agency.

## Key Features

* **Website Management** — Manage website content through a centralized dashboard.
* **Automated Website Generation** — Generate production-ready websites from structured content and reusable templates.
* **SEO Management** — Generate sitemaps and structure website content to support search engine visibility.
* **Automated Deployment** — Build and deploy generated websites to Cloudflare infrastructure.
* **Domain Management** — Support custom domain configuration and website publishing workflows.
* **Content Management System** — Manage pages, collections, rich text, images, galleries, videos, and other structured content.
* **Client Management** — Centralize website administration and client-facing operations.
* **Payments & Subscriptions** — Integrate Stripe to manage customer payments and subscription workflows.

## Tech Stack

| Technology | Purpose                                       |
| ---------- | --------------------------------------------- |
| React      | Frontend application                          |
| Node.js    | Backend runtime                               |
| Express.js | API and backend services                      |
| Supabase   | Database and backend services                 |
| Cloudflare | Website hosting and deployment infrastructure |
| Stripe     | Payments and subscriptions                    |

## Architecture

Wenoble Dashboard combines a React-based frontend with a Node.js and Express backend, using Supabase for data persistence and Cloudflare for website deployment and hosting.

The platform separates dashboard operations from generated websites, enabling centralized management while allowing client websites to be deployed independently.

### Core Workflow

1. Clients manage their website content through the dashboard.
2. The backend processes content and generates website pages.
3. The generated website is prepared for deployment.
4. Cloudflare infrastructure handles publishing and hosting.
5. Clients manage their content and website operations from a centralized interface.

## Technical Highlights

* Automated website generation and deployment workflows.
* API-driven architecture separating frontend and backend responsibilities.
* Structured content management for dynamic pages and collections.
* Cloud-based hosting infrastructure designed for independent client websites.
* Integration of payment and subscription workflows.
* SEO-oriented features, including automatic sitemap generation.

## Project Context

Wenoble Dashboard is a proprietary platform developed to support Wenoble's internal operations and client services.

The source code is private, as the platform contains proprietary business logic and infrastructure.

---

**Built with React, Node.js, Express, Supabase, Cloudflare, and Stripe.**

Website: [wenoble.fr](https://wenoble.fr)
