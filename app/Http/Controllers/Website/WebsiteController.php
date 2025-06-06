<?php

namespace App\Http\Controllers\Website;

use App\Http\Controllers\Controller;
use App\Mail\ContactUs;
use App\Models\EmailSubscriber;
use App\Models\Faq;
use App\Models\Feature;
use App\Models\Package;
use App\Models\Page;
use App\Models\Post;
use App\Models\Testimonial;
use App\Utilities\Overrider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class WebsiteController extends Controller
{

	/**
	 * Create a new controller instance.
	 *
	 * @return void
	 */
	public function __construct()
	{
		if (env('APP_INSTALLED', true) == true) {
			date_default_timezone_set(get_option('timezone', 'Asia/Dhaka'));
			$this->middleware(function ($request, $next) {
				if (isset($_GET['language'])) {
					session(['language' => $_GET['language']]);
					return back();
				}
				if (get_option('website_enable', 1) == 0) {
					return redirect()->route('login');
				}
				return $next($request);
			});
		}
	}

	/**
	 * Display website's home page
	 *
	 * @return \Illuminate\Http\Response
	 */
	public function index($slug = '')
	{
		return redirect()->route('login');
		$data = array();

		if ($slug != '') {
			$page = Page::where('slug', $slug)->where('status', 1)->first();
			if (!$page) {
				abort(404);
			}
			return Inertia::render('Website/page', compact('page'));
		}

		$data['pageData'] = json_decode(get_trans_option('home_page'));
		$data['pageMedia'] = json_decode(get_trans_option('home_page_media'));
		if (isset($data['pageData']->title)) {
			$data['page_title'] = $data['pageData']->title;
		}
		$data['features'] = Feature::active()->get();
		$data['packages'] = Package::active()->get();
		$data['blog_posts'] = Post::active()->limit(3)->orderBy('id', 'desc')->get();
		$data['testimonials'] = Testimonial::all();

		return Inertia::render('Website/Index', $data);
	}

	public function about()
	{
		$data = array();
		$data['pageData'] = Page::where('slug', 'about')->first();
		$data['page_title'] = isset($data['pageData']->title) ? $data['pageData']->title : '';
		return Inertia::render('Website/About', $data);
	}

	public function features()
	{
		$data = array();
		$data['pageData'] = Page::where('slug', 'features')->first();
		$data['page_title'] = isset($data['pageData']->title) ? $data['pageData']->title : '';
		return Inertia::render('Website/Features', $data);
	}

	public function pricing()
	{
		$data = array();
		$data['pageData'] = Page::where('slug', 'pricing')->first();
		$data['page_title'] = isset($data['pageData']->title) ? $data['pageData']->title : '';
		return Inertia::render('Website/Pricing', $data);
	}

	public function terms()
	{
		$page = Page::where('slug', 'terms-condition')->with('translations')->first();
		return Inertia::render('Website/Terms', compact('page'));
	}

	public function blogs($slug = '')
	{
		$data = array();
		if ($slug) {
			$data['post'] = Post::where('slug', $slug)->first();
			if (!$data['post']) {
				abort(404);
			}
			return view('website.single-blog', $data);
		}
		$data['pageData'] = json_decode(get_trans_option('blogs_page'));
		$data['pageMedia'] = json_decode(get_trans_option('blogs_page_media'));
		$data['blog_posts'] = Post::active()->orderBy('id', 'desc')->paginate(12);
		$data['page_title'] = isset($data['pageData']->title) ? $data['pageData']->title : '';

		return view('website.blogs', $data);
	}

	public function faq()
	{
		$data = array();
		$data['pageData'] = json_decode(get_trans_option('faq_page'));
		$data['page_title'] = isset($data['pageData']->title) ? $data['pageData']->title : '';

		$data['faqs'] = Faq::where('status', 1)->get();
		return Inertia::render('Website/Faq', $data);
	}

	public function contact()
	{
		$data['pageData'] = json_decode(get_trans_option('contact_page'));
		$data['page_title'] = isset($data['pageData']->title) ? $data['pageData']->title : '';

		return Inertia::render('Website/Contact', $data);
	}

	public function send_message(Request $request)
	{
		return back();
		config(['recaptchav3.sitekey' => get_option('recaptcha_site_key')]);
		config(['recaptchav3.secret' => get_option('recaptcha_secret_key')]);

		$request->validate([
			'g-recaptcha-response' => get_option('enable_recaptcha', 0) == 1 ? 'required' : '',
		], [
			'g-recaptcha-response.recaptchav3' => _lang('Recaptcha error!'),
		]);

		@ini_set('max_execution_time', 0);
		@set_time_limit(0);

		Overrider::load("Settings");

		$request->validate([
			'name' => 'required',
			'email' => 'required|email',
			'subject' => 'required',
			'message' => 'required',
		]);

		//Send Email
		$name = $request->input("name");
		$email = $request->input("email");
		$subject = $request->input("subject");
		$message = $request->input("message");

		$mail = new \stdClass();
		$mail->name = $name;
		$mail->email = $email;
		$mail->subject = $subject;
		$mail->message = $message;

		if (get_option('email') != '') {
			try {
				Mail::to(get_option('email'))->send(new ContactUs($mail));
				return back()->with('success', _lang('Thank you for contacting us! We will respond to your message as soon as possible.'));
			} catch (\Exception $e) {
				return back()->with('error', $e->getMessage())->withInput();
			}
		}
	}

	public function privacy()
	{
		$page = Page::where('slug', 'privacy-policy')->with('translations')->first();
		return Inertia::render('Website/Privacy', compact('page'));
	}

	public function post_comment(Request $request)
	{
		$validator = Validator::make($request->all(), [
			'name' => 'required',
			'email' => 'required|email',
			'comment' => 'required',
			'post_id' => 'required',
		]);

		if ($validator->fails()) {
			if ($request->ajax()) {
				return response()->json(['result' => 'error', 'message' => $validator->errors()->all()]);
			} else {
				return back()->withErrors($validator)->withInput();
			}
		}

		$post = Post::find($request->post_id);
		if (!$post) {
			return back()->with('error', 'Post not found')->withInput();
		}

		if (auth()->check()) {
			$request->merge(['user_id' => auth()->id()]);
			$request->merge(['name' => auth()->user()->name]);
			$request->merge(['email' => auth()->user()->email]);
		}
		$request->merge(['status' => 1]);
		$post->comments()->create($request->all());

		return back()->with('success', _lang('Your comment posted sucessfully.'));
	}

	public function email_subscription(Request $request)
	{
		$validator = Validator::make($request->all(), [
			'email_address' => 'required|email|unique:email_subscribers',
		]);

		if ($validator->fails()) {
			if ($request->ajax()) {
				return response()->json(['result' => 'error', 'message' => $validator->errors()->all()]);
			} else {
				return back()->withErrors($validator)->withInput();
			}
		}
		$emailSubscriber = new EmailSubscriber();
		$emailSubscriber->email_address = $request->email_address;
		$emailSubscriber->ip_address = $request->ip();
		$emailSubscriber->save();

		if ($request->ajax()) {
			return response()->json(['result' => 'success', 'message' => _lang('Thank you for subscription')]);
		} else {
			return back()->with('success', _lang('Thank you for subscription'));
		}
	}
}
