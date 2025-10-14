"use client";
import React from "react";
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, Arial, sans-serif' }}>
        <div className="container">
          <div className="header">
            <h1>CSO Studio</h1>
            <span className="badge">v1.0</span>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}


