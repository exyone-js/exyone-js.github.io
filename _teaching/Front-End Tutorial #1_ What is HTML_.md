---
title: 'Front-End Tutorial #1. What is HTML?'
date: 2023-08-14
permalink: /tutorial/Front-End-Tutorial-1-What-is-HTML-/
tags:
  - cool posts
  - category1
  - category2
---

# Welcome to Your First Step in Front-End Development: HTML!

## What is HTML?

Have you ever wondered how your browser knows what content to display and how to display it when you open a webpage? The secret behind this lies largely in HTML—a specialized language used to describe the structure and content of web pages.

HTML is like the skeleton of a webpage; the text displayed on the webpage is supported by HTML.

### Understanding HTML Basics

HTML stands for HyperText Markup Language. But what does that mean in simpler terms?

- HTML is **NOT** a programming language—it's a markup language (like highlighting parts of a document)
- As a markup language, it uses special tags to annotate and organize text (similar to how you might use different colored pens to mark up a document)
- These tags help define the structure and content of a webpage (like chapters and sections in a book)
- An HTML document combines these tags with plain text to create what we commonly call a webpage
- HTML uses these tags to describe the structure and content of a web page.
- An HTML document contains HTML tags and plain text.
- An HTML document is also commonly called a web page.

## HTML Tags:

HTML uses tags to mark different parts of a webpage.

You can also think of tags as **marker pen**; after using them, HTML will tell the web page what this piece of text means.

### What Are HTML Tags?

- HTML tags are keywords surrounded by angle brackets, like `<html>`
- Most HTML tags come in pairs: an opening tag (`<b>`) and a closing tag (`</b>`)
- The first tag in a pair is the opening tag, and the second is the closing tag
- Opening and closing tags are also called start tags and end tags

### Tag Syntax
```
<tag>content</tag>
```

For example, to make text bold, you would use:
```
<b>This text will appear bold</b>
```

## HTML Elements: More Than Just Tags

While the terms "HTML tag" and "HTML element" are often used interchangeably, there's an important distinction to understand:

### What's the Difference?

An HTML element encompasses everything from the opening tag to the closing tag. Think of it this way:
- Tags are like the "bookends" 
- The element is everything between and including those bookends

To put it in perspective, think of making a sandwich:
- The bread slices are like the opening and closing tags
- Everything between them (meat, cheese, vegetables) is like the content
- The whole sandwich is like the HTML element

### Example of an HTML Element:
```html
<p>This is a paragraph.</p>
```

In this example:
- `<p>` is the opening tag (like the top slice of bread)
- `</p>` is the closing tag (like the bottom slice of bread)
- The entire line including both tags and the content ("This is a paragraph.") is the HTML element (the complete sandwich)

## Web Browsers: The Interpreters of HTML

Web browsers like Chrome, Internet Explorer, Firefox, and Safari act as interpreters for HTML documents. Think of them as skilled translators that convert the "secret code" of HTML into the beautiful web pages you see every day.

### How Browsers Work with HTML

- Browsers **don't display** the HTML tags themselves
- Instead, they use these tags as instructions to determine how to render the content
- Each browser has its own rendering engine that processes HTML and converts it into visual elements
- This is why a webpage might look slightly different across different browsers

It's like having a recipe written in a foreign language—you can't understand the symbols on the page, but a translator (the browser) can interpret those symbols and turn them into a delicious meal (the webpage)!

## HTML Page Structure: Building Your Webpage

Every HTML document follows a specific structure—think of it as the blueprint for constructing a house. Just as a house needs a foundation, walls, and a roof, an HTML page needs certain essential elements to function properly.

Think of building a house:
- The `<html>` tag is like the property boundaries—everything goes inside
- The `<head>` is like the attic—contains important information but isn't visible from the street
- The `<body>` is like the main living space—what everyone sees when they visit

### Basic HTML Page Structure:
```html
<html>
<head>
    <title>Page Title</title>
</head>
<body>
    <h1>This is a Heading</h1>
    <p>This is a paragraph.</p>
    <p>This is another paragraph.</p>
</body>
</html>
```

### Key Components Explained:

1. **`<html>`** - The root element that wraps the entire document (like the property fence around a house)
2. **`<head>`** - Contains meta-information about the document (not displayed) (like the home's blueprint)
3. **`<title>`** - Sets the title shown in the browser tab (like the nameplate on your mailbox)
4. **`<body>`** - Contains all visible content (like the rooms in your house where guests can see)

**Important Note:** Only content inside the `<body>` section is displayed in the browser window.

## Evolution of HTML: From Simple to Sophisticated

HTML has come a long way since the early days of the web! Like software and technology, HTML has evolved through multiple versions, each bringing new features and capabilities.

### Journey Through HTML History:

| Version   | Year | Key Features                                         |
| --------- | ---- | ---------------------------------------------------- |
| HTML      | 1991 | First version with basic text formatting             |
| HTML+     | 1993 | Introduced forms and tables                          |
| HTML 2.0  | 1995 | Standardized basic HTML features                     |
| HTML 3.2  | 1997 | Added support for multimedia                         |
| HTML 4.01 | 1999 | Enhanced scripting and internationalization          |
| XHTML 1.0 | 2000 | Stricter syntax rules                                |
| HTML5     | 2012 | Modern features like video, audio, and semantic tags |
| XHTML5    | 2013 | Combination of HTML5 and XML syntax                  |

Each version built upon the previous one, making HTML more powerful and versatile for creating modern web experiences.

## The <!DOCTYPE> Declaration: Setting the Rules

The `<!DOCTYPE>` declaration is like telling your browser which "dialect" of HTML you're using. It's not an HTML tag, but rather an instruction that helps browsers display your webpage correctly.

### Why Is It Important?

Without a proper DOCTYPE declaration, browsers might enter "quirks mode" and render your page inconsistently. Think of it as telling someone which language you're speaking before starting a conversation.

### HTML5 DOCTYPE (Modern Standard):

```html
<!DOCTYPE html>
```

This simple declaration is all you need for modern HTML5 documents.

### Other Common DOCTYPE Declarations:

#### HTML 4.01
```html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
```

#### XHTML 1.0
```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
```

### Key Points to Remember:

- The declaration is **not case sensitive**
- Place it at the very top of your HTML document (before the `<html>` tag)
- For modern websites, `<!DOCTYPE html>` is sufficient and recommended

## Character Encoding: Making Text Display Correctly

To ensure your web pages display text correctly—especially in different languages like Chinese—you need to declare the character encoding. Without proper encoding, visitors might see strange symbols instead of readable text.

### Why Character Encoding Matters

Imagine trying to read a book where all the letters are jumbled or replaced with random symbols—that's what happens when character encoding isn't properly declared!

### Setting UTF-8 Encoding (Recommended)

For modern websites, UTF-8 is the standard encoding that supports virtually all languages:

```html
<meta charset="UTF-8">
```

Place this line within the `<head>` section of your HTML document.

### Complete Example with Proper Encoding

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Website!</h1>
    <p>This text will display correctly with proper encoding.</p>
</body>
</html>
```

## Putting It All Together: A Complete HTML Example

Let's look at a full HTML document that incorporates everything we've learned so far. This example will serve as your template for creating web pages.

### Full HTML Document Example:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My First Webpage</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
    <p>This is my first paragraph. HTML is <b>fun</b> and <i>easy</i> to learn!</p>
    <p>This is another paragraph with a <a href="https://www.example.com">link</a>.</p>
</body>
</html>
```

### Breaking Down the Example:

1. **`<!DOCTYPE html>`** - Declares this as an HTML5 document
2. **`<html>`** - Root element containing the entire page
3. **`<head>`** - Contains metadata (not displayed)
   - **`<meta charset="UTF-8">`** - Sets character encoding
   - **`<title>`** - Sets the page title (shown in browser tab)
4. **`<body>`** - Contains all visible content
   - **`<h1>`** - Main heading
   - **`<p>`** - Paragraphs
   - **`<b>`** - Bold text
   - **`<i>`** - Italic text
   - **`<a>`** - Hyperlink

### Try It Yourself!

Copy this code into a text editor, save it as _index.html_, and open it in your browser to see your first webpage come to life!
