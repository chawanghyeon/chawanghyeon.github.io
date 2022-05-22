---
title: 'JAVA-Mini-Project-Make-Object'
date: 2020-11-11
draft: false
description: 'JAVA-Mini-Project-Make-Object'
tags: [JAVA-Mini-Project-Make-Object]
categories: [projects]
---
# [JAVA-Mini-Project-Make-Object](https://github.com/chawanghyeon/JAVA-Mini-Project-Make-Object)

### 프로젝트 만든 이유
객체의 생성 순서에 대해 정확하게 학습하기 위하여 예제를 만들었습니다.

### Why did you create the project?
You have created an example to learn about the exact order in which objects are created.

```
class A{
	int no = 10;
	Customer c = Customer.builder().car(new Car("그랜저", 77)).name("윤혜").food(new Food("라면")).build();
}
class B{
	A a = new A();
	Car car = new Car("소나타", 77);
	Food b = new Food("마라탕");
}
class C{
	B b = new B();
	Customer c = Customer.builder().car(new Car("그랜저", 77)).name("윤혜").food(new Food("라면")).build();
}
public class Practice {

	public static void main(String[] args) {
		ArrayList<C> all = new ArrayList<>();
		all.add(new C());
	}

}
```
위의 코드에서 간략한 객체 생성 순서는 A -> B -> C 입니다.

In the code above, the order in which objects are created is A -> B -> C.
