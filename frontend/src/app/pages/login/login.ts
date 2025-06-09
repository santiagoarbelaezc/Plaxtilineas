import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoginFormComponent } from '../../components/login-form/login-form.component';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, LoginFormComponent ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

}
