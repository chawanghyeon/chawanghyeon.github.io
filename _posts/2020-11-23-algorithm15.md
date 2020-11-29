---
title: "Programmers 문자열 다루기 기본"
date: 2020-11-23T22:59:08+09:00
draft: false
description: "Programmers 문자열 다루기 기본"
tags: [algorithm]
categories: [algorithm]
---
문자열 s의 길이가 4 혹은 6이고, 숫자로만 구성돼있는지 확인해주는 함수, solution을 완성하세요. 예를 들어 s가 a234이면 False를 리턴하고 1234라면 True를 리턴하면 됩니다.

제한 사항
- s는 길이 1 이상, 길이 8 이하인 문자열입니다.

풀이
```
class Solution {

  public boolean solution(String s) {
    if(s.length() == 4 || s.length() == 6) {
		  for (int i = 0; i < s.length(); i++) {
			  char ch = s.charAt(i);
				if(ch < '0' || ch > '9') return false;
			}
			return true;
		} 
    return false;
  }
  
}
```
