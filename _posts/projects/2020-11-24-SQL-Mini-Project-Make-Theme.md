---
title: 'SQL-Mini-Project-Make-Theme'
date: 2020-11-24
draft: false
description: 'SQL-Mini-Project-Make-Theme'
tags: [SQL-Mini-Project-Make-Theme]
categories: [projects]
---
# [SQL-Mini-Project-Make-Theme](https://github.com/chawanghyeon/SQL-Mini-Project-Make-Theme)

SQL을 학습하면서 Outer join이 이해되지 않았습니다. 그래서 팀원 한명과 함께 문제를 만들어보면 이해가 되지 않을까라는 생각에 문제를 만들어 봤습니다.

Outer join was not understood while learning SQL. So I thought it would be understandable if I made a problem with one of my team members.

Student table

![학생](https://user-images.githubusercontent.com/53591258/100357469-0da2b180-3038-11eb-8005-acb5d2364c44.PNG)

Professor table

![교수](https://user-images.githubusercontent.com/53591258/100357723-66724a00-3038-11eb-9bc6-665f25b19a85.PNG)

Question1

![문제1](https://user-images.githubusercontent.com/53591258/100357847-90c40780-3038-11eb-9a43-d6a81a8f1670.PNG)

Question2

![문제2](https://user-images.githubusercontent.com/53591258/100357880-9de0f680-3038-11eb-924c-11ab015be89f.PNG)

Question1 Answer
```
select s.name, snumber, sdepartment, p.name 
from student s, professor p 
where s.pnumber = p.pnumber(+);
```

Question2 Answer
```
select s.name, p.name, s.pnumber 
from student s, professor p
where s.pnumber = p.pnumber(+);
```

