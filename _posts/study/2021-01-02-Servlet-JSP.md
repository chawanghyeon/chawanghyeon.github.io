---
title: 'Servlet-JSP'
date: 2021-01-02
description: 'Servlet-JSP'
tags: [Servlet-JSP]
categories: [Servlet-JSP]
---

## Web Server

Web Server = Web Application Server(WAS) = Servelt Engine = Container

Web project = (web) context

## Http
1. [Wikipedia](https://en.wikipedia.org/wiki/Hypertext_Transfer_Protocol)
2. [Mozilla](https://developer.mozilla.org/en-US/docs/Web/HTTP)

## Servlet
It is considered to be a process inside the server.

- HttpServlet
    - Parent class
    - Support for http communication
- HttpServletRequest
    - The object that holds the information requested by the client
    - API
        - String getParameter()  
        - String[] getParameterValues()
        - setCharacterEncoding()
- HttpServletResponse
    - Object responding to requested client
    - API
        - setContentType("mimetype;charset=utf-8")
        - PrintWriter gerWriter()
        - sendRedirect()
- Cookie
    - Store the values that the client system keeps in state
    - new Cookie(key, value)
    - setMaxAge()
    - addCookie()
    - Cookie[] c = request.getCookies()
    - getName("name")
    - getValue()
- HttpSession
    - Store the values that the server system keeps in state
    - API
        - HttpSession s = request.getSession()
        - s.setAttribute(key, value)
        - s.getAttribute(key)
        - s.removeAttribute(key)
        - s.invalidate()
- ServletContext
    - Unique objects, one for each project deployed on the server
    - Store in ServletContext to provide resources shared by all customers using web projects

## Technology for preventing DB system from down
1. Adjust the number of connections
2. Create Connection Objects and Keep them Standby
3. If the maximum number of connectors are created and disconnected, only the connections are returned to separate memory stored, not deleted
4. Separate between web application server and db server


# [Servlet-JSP project example](https://github.com/chawanghyeon/JPA-Web-Soccer_team_manager)
