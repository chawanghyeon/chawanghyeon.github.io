---
title: "Programmers 정수 내림차순으로 배치하기"
date: 2020-11-23T23:01:50+09:00
draft: false
description: "Programmers 정수 내림차순으로 배치하기"
tags: [algorithm]
categories: [algorithm]
---
함수 solution은 정수 n을 매개변수로 입력받습니다. n의 각 자릿수를 큰것부터 작은 순으로 정렬한 새로운 정수를 리턴해주세요. 예를들어 n이 118372면 873211을 리턴하면 됩니다.

제한 조건
- n은 1이상 8000000000 이하인 자연수입니다.

풀이
```
import java.util.Arrays;

class Solution {

  public long solution(long n) {
    String num = String.valueOf(n);
    String ansnum = "";
    char[] arr = new char[num.length()];
    for(int i = 0; i < num.length(); i++){
      arr[i] = num.charAt(i);
    }
    Arrays.sort(arr);
    
    for(int i = arr.length - 1; i >= 0; i--){
      ansnum += arr[i];
    }
    long answer = Long.parseLong(ansnum);
    return answer;
  }

}
```